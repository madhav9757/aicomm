#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";
import ora from "ora";
import pc from "picocolors";
import boxen from "boxen";
import figures from "figures";

// Import local logic
import { getGitStatus } from "../src/git/status.js";
import { getGitDiff } from "../src/git/diff.js";
import { generateCommitMessage } from "../src/ai/generateCommit.js";
import { askCommitMessage } from "../src/ui/prompt.js";
import { commitChanges } from "../src/commit.js";
import { validateEnvironment } from "../src/utils/validation.js";

const program = new Command();

program
  .name("aicomm")
  .description(`${pc.cyan("AI-powered git commit assistant (Local Edition)")}`)
  .version("1.0.0")
  .option("--dry-run", "Generate commit message without committing")
  .option("--diff", "Show git diff before committing")
  .option("--no-ai", "Skip AI generation and use fallback")
  .option("--push", "Push changes after committing")
  .option(
    "--model <name>",
    "Specify Ollama model (default: llama3.2)",
    "llama3.2"
  )
  .option("--verbose", "Show detailed output");

program.parse(process.argv);
const options = program.opts();

async function run() {
  console.log(
    boxen(pc.bold(pc.cyan("AICOMM 🤖")), {
      padding: { left: 3, right: 3 },
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
    })
  );

  const spinner = ora();

  try {
    // 1. Validation - Updated for Local Ollama
    if (!options.noAi) {
      spinner.start(pc.dim("Checking AI engine..."));
      const envCheck = await validateEnvironment(); // Now async

      if (!envCheck.valid) {
        spinner.stop();
        console.error(`${pc.red(figures.cross)} ${pc.bold("Ollama Offline")}`);
        console.log(`${pc.yellow(figures.warning)} ${envCheck.error}`);
        console.log(
          `\n${pc.dim("Quick Fix: Open the Ollama app or run 'ollama serve' in your terminal.")}`
        );
        process.exit(1);
      }
      spinner.stop();
    }

    // 2. Status Check
    spinner.start(pc.dim("Scanning workspace..."));
    const status = await getGitStatus();
    spinner.stop();

    if (!status.files?.length) {
      console.log(
        `${pc.green(figures.tick)} No changes to commit. Clean as a whistle!`
      );
      return;
    }

    // 3. Summary Display
    console.log(pc.bold(pc.underline("Workspace Summary")));
    console.log(
      `${pc.yellow(figures.bullet)} Modified: ${pc.bold(status.modified.length)}`
    );
    console.log(
      `${pc.green(figures.bullet)} Created:  ${pc.bold(status.created.length)}`
    );
    console.log(
      `${pc.red(figures.bullet)} Deleted:  ${pc.bold(status.deleted.length)}`
    );
    console.log(
      `${pc.blue(figures.bullet)} Staged:   ${pc.bold(status.staged.length)}\n`
    );

    // 4. Diff Logic
    spinner.start(pc.dim("Analyzing changes..."));
    const diff = await getGitDiff();
    spinner.stop();

    if (!diff?.trim()) {
      console.log(`${pc.yellow(figures.info)} No meaningful diff detected.`);
      return;
    }

    if (options.diff) {
      console.log(
        boxen(pc.dim(diff), {
          title: "Git Diff",
          padding: 1,
          borderColor: "dim",
        })
      );
    }

    // 5. AI Generation - Pass the whole options object for model choice
    let aiMessage = "chore: update files";
    if (!options.noAi) {
      spinner.start(pc.magenta(`AI (${options.model}) is thinking...`));
      aiMessage = await generateCommitMessage(diff, options, spinner);
      spinner.succeed(pc.green("AI suggestion ready"));
    }

    // 6. User Prompt
    const finalMessage = await askCommitMessage(aiMessage);

    if (!finalMessage?.trim()) {
      console.error(`${pc.red(figures.cross)} Commit message cannot be empty.`);
      process.exit(1);
    }

    // 7. Execution
    if (options.dryRun) {
      console.log(`\n${pc.yellow(figures.warning)} ${pc.bold("DRY RUN MODE")}`);
      console.log(`${pc.dim("Proposed message:")} ${pc.italic(finalMessage)}`);
      return;
    }

    spinner.start(pc.cyan("Executing commit..."));
    await commitChanges(finalMessage);
    spinner.succeed(pc.green("Changes committed!"));
    console.log(
      boxen(pc.green(finalMessage), {
        title: "Final Commit Message",
        padding: 1,
        borderColor: "green",
        margin: { top: 1 },
      })
    );

    if (options.push) {
      spinner.start(pc.blue("Pushing to remote..."));
      try {
        await pushChanges();
        spinner.succeed(pc.blue("Synced with remote!"));
      } catch (err) {
        spinner.fail(pc.red("Push failed"));
        console.error(`${pc.red(figures.warning)} ${err.message}`);
        process.exit(1);
      }
    }
  } catch (err) {
    if (spinner.isSpinning) spinner.stop();
    console.error(`\n${pc.bgRed(" FATAL ERROR ")} ${pc.red(err.message)}`);
    if (options.verbose) console.error(pc.dim(err.stack));
    process.exit(1);
  }
}

async function pushChanges() {
  const { pushToRemote } = await import("../src/commit.js");
  await pushToRemote();
}

run();
