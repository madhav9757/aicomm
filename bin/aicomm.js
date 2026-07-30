#!/usr/bin/env node
import inquirer from "inquirer";
import { Command } from "commander";
import "dotenv/config";

import ora from "ora";
import pc from "picocolors";
import boxen from "boxen";
import figures from "figures";

import { getGitStatus } from "../src/git/status.js";
import { getGitDiff } from "../src/git/diff.js";
import { generateCommitMessage } from "../src/ai/generateCommit.js";
import { askCommitMessage } from "../src/ui/prompt.js";
import { commitChanges, pushToRemote, stageFiles } from "../src/commit.js";
import { validateEnvironment } from "../src/utils/validation.js";

// 👇 Here is the missing import that caused the crash!
import { getApiKey, saveApiKey } from "../src/utils/config.js"; 

const program = new Command();

program
  .name("aicomm")
  .description("🚀 AI-powered git commit assistant")
  .version("1.1.0")
  .option("-d, --dry-run", "Generate commit message without committing")
  .option("-v, --verbose", "Show detailed output")
  .option("-p, --push", "Push changes after committing")
  .option("-s, --stage-all", "Stage all changes before generating")
  .option("-m, --model <name>", "Specify Gemini model", "gemini-3.6-flash")
  .option("--no-ai", "Skip AI generation and use fallback");

program.parse(process.argv);
const options = program.opts();

async function run() {
  console.log(
    boxen(pc.bold(pc.cyan("AICOMM 🤖")), {
      padding: { left: 3, right: 3 },
      margin: { top: 1, bottom: 1 },
      borderStyle: "single",
      borderColor: "cyan",
      title: "v1.1.0",
      titleAlignment: "right"
    })
  );

  const spinner = ora();

  try {
    // 1. Environment Validation
    const envCheck = await validateEnvironment();
    if (!envCheck.valid) {
      console.error(`${pc.red(figures.cross)} ${pc.bold(envCheck.error)}`);
      process.exit(1);
    }

    // 2. API Validation & Interactive Setup
    if (!options.noAi) {
      let apiKey = process.env.GEMINI_API_KEY || process.env.geminie_key || getApiKey();
      
      if (!apiKey) {
        console.log(`\n${pc.yellow(figures.warning)} ${pc.bold("No API Key Found")}`);
        console.log(pc.dim("Let's set it up! Your key will be saved securely on your machine."));
        
        const { newKey } = await inquirer.prompt([
          {
            type: "password", // This masks the input with asterisks
            name: "newKey",
            message: "Enter your Gemini API Key:",
            mask: "*",
          },
        ]);

        if (!newKey || !newKey.trim()) {
          console.error(`${pc.red(figures.cross)} API Key is required to use AI generation. Run with --no-ai to skip.`);
          process.exit(1);
        }

        // Save it globally
        saveApiKey(newKey.trim());
        console.log(pc.green(`${figures.tick} API Key saved globally!\n`));
      }
    }

    // 3. Status Check
    spinner.start(pc.dim("Scanning workspace..."));
    const status = await getGitStatus();
    spinner.stop();

    if (!status.hasChanges && !status.hasStagedChanges) {
      console.log(`${pc.green(figures.tick)} No changes to commit. Clean as a whistle!`);
      return;
    }

    if (options.stageAll && status.hasUnstagedChanges) {
      spinner.start(pc.dim("Staging changes..."));
      await stageFiles(".");
      spinner.succeed(pc.green("All changes staged"));
    }

    // 4. Summary Display
    console.log(pc.bold(pc.underline("Workspace Summary")));
    console.log(`${pc.yellow(figures.bullet)} Modified: ${pc.bold(status.modified.length)}`);
    console.log(`${pc.green(figures.bullet)} Created:  ${pc.bold(status.not_added.length)}`);
    console.log(`${pc.red(figures.bullet)} Deleted:  ${pc.bold(status.deleted.length)}`);
    console.log(`${pc.blue(figures.bullet)} Staged:   ${pc.bold(status.staged.length)}\n`);

    // 5. Diff Logic
    spinner.start(pc.dim("Analyzing changes..."));
    const diff = await getGitDiff({ staged: true, unstaged: !status.hasStagedChanges });
    spinner.stop();

    if (!diff?.trim()) {
      console.log(`${pc.yellow(figures.info)} No meaningful diff detected. Try staging changes manually.`);
      return;
    }

    // 6. AI Generation Loop
    let finalMessage;
    let aiMessage = "chore: update files";

    while (true) {
      if (!options.noAi) {
        spinner.start(pc.magenta(`AI is thinking...`));
        aiMessage = await generateCommitMessage(diff, options, spinner);
        spinner.succeed(pc.green("AI suggestion ready"));
      }

      finalMessage = await askCommitMessage(aiMessage);

      if (finalMessage === "regenerate") {
        console.log(pc.dim("\nRetrying generation..."));
        continue;
      }
      
      break; 
    }

    if (!finalMessage?.trim()) {
      console.error(`${pc.red(figures.cross)} Commit message cannot be empty.`);
      process.exit(1);
    }

    // 7. Execution
    if (options.dryRun) {
      console.log(`\n${pc.yellow(figures.warning)} ${pc.bold("DRY RUN MODE")}`);
      console.log(boxen(pc.italic(finalMessage), { padding: 1, borderColor: "yellow", title: "Proposed Message" }));
      return;
    }

    spinner.start(pc.cyan("Executing commit..."));
    await commitChanges(finalMessage);
    spinner.succeed(pc.green("Changes committed!"));

    console.log(
      boxen(pc.green(finalMessage), {
        title: "Final Commit",
        padding: 1,
        borderStyle: "single",
        borderColor: "green",
        margin: { top: 1 },
      })
    );

    if (options.push) {
      spinner.start(pc.blue("Pushing to remote..."));
      try {
        await pushToRemote();
        spinner.succeed(pc.blue("Synced with remote!"));
      } catch (err) {
        spinner.fail(pc.red("Push failed"));
        console.error(`${pc.red(figures.warning)} ${err.message}`);
      }
    }

    console.log(`\n${pc.cyan("Happy coding! 🚀")}`);
  } catch (err) {
    if (spinner.isSpinning) spinner.stop();
    console.error(`\n${pc.bgRed(" ERROR ")} ${pc.red(err.message)}`);
    if (options.verbose) console.error(pc.dim(err.stack));
    process.exit(1);
  }
}

run();