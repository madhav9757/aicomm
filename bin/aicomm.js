#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";

const program = new Command();

program
  .name("aicomm")
  .description("🚀 AI-powered git commit assistant")
  .version("1.1.0")
  .option("-d, --dry-run", "Generate commit message without committing")
  .option("-v, --verbose", "Show detailed output")
  .option("-p, --push", "Push changes after committing")
  .option("-s, --stage-all", "Stage all changes before generating")
  .option("-m, --model <name>", "Specify Gemini model", "gemini-1.5-flash")
  .option("--no-ai", "Skip AI generation and use fallback");

program.parse(process.argv);
const options = program.opts();

async function run() {
  // Dynamic imports for faster initial startup
  const [
    { default: ora },
    { default: pc },
    { default: boxen },
    { default: figures },
    { getGitStatus },
    { getGitDiff },
    { generateCommitMessage },
    { askCommitMessage },
    { commitChanges, pushToRemote },
    { validateEnvironment }
  ] = await Promise.all([
    import("ora"),
    import("picocolors"),
    import("boxen"),
    import("figures"),
    import("../src/git/status.js"),
    import("../src/git/diff.js"),
    import("../src/ai/generateCommit.js"),
    import("../src/ui/prompt.js"),
    import("../src/commit.js"),
    import("../src/utils/validation.js")
  ]);

  console.log(
    boxen(pc.bold(pc.cyan("AICOMM 🤖")), {
      padding: { left: 3, right: 3 },
      margin: { top: 1, bottom: 1 },
      borderStyle: "double",
      borderColor: "cyan",
      title: "v1.1.0",
      titleAlignment: "right"
    })
  );

  const spinner = ora();

  try {
    // 1. Validation
    if (!options.noAi) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.geminie_key;
      if (!apiKey) {
        console.error(`${pc.red(figures.cross)} ${pc.bold("API Key Missing")}`);
        console.log(`${pc.yellow("Please add GEMINI_API_KEY=your_key to your .env file.")}`);
        process.exit(1);
      }
    }

    // 2. Status Check
    spinner.start(pc.dim("Scanning workspace..."));
    const status = await getGitStatus();
    spinner.stop();

    if (!status.hasChanges && !status.hasStagedChanges) {
      console.log(`${pc.green(figures.tick)} No changes to commit. Clean as a whistle!`);
      return;
    }

    if (options.stageAll && status.hasUnstagedChanges) {
      spinner.start(pc.dim("Staging changes..."));
      const { stageFiles } = await import("../src/commit.js");
      await stageFiles(".");
      spinner.succeed(pc.green("All changes staged"));
    }

    // 3. Summary Display
    console.log(pc.bold(pc.underline("Workspace Summary")));
    console.log(`${pc.yellow(figures.bullet)} Modified: ${pc.bold(status.modified.length)}`);
    console.log(`${pc.green(figures.bullet)} Created:  ${pc.bold(status.not_added.length)}`);
    console.log(`${pc.red(figures.bullet)} Deleted:  ${pc.bold(status.deleted.length)}`);
    console.log(`${pc.blue(figures.bullet)} Staged:   ${pc.bold(status.staged.length)}\n`);

    // 4. Diff Logic
    spinner.start(pc.dim("Analyzing changes..."));
    const diff = await getGitDiff({ staged: true, unstaged: !status.hasStagedChanges });
    spinner.stop();

    if (!diff?.trim()) {
      console.log(`${pc.yellow(figures.info)} No meaningful diff detected. Try staging changes manually.`);
      return;
    }

    // 5. AI Generation
    let aiMessage = "chore: update files";
    if (!options.noAi) {
      spinner.start(pc.magenta(`AI is thinking...`));
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

