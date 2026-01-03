#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";
import ora from "ora";
import { getGitStatus } from "../src/git/status.js";
import { getGitDiff } from "../src/git/diff.js";
import { generateCommitMessage } from "../src/ai/generateCommit.js";
import { askCommitMessage } from "../src/ui/prompt.js";
import { commitChanges } from "../src/commit.js";
import { loadConfig } from "../src/config/loadConfig.js";
import { validateEnvironment } from "../src/utils/validation.js";

const program = new Command();

program
  .name("aicomm")
  .description("AI-powered git commit assistant")
  .version("1.0.0")
  .option("--dry-run", "Generate commit message without committing")
  .option("--diff", "Show git diff before committing")
  .option("--no-ai", "Skip AI generation and use fallback commit message")
  .option("--push", "Push changes after committing")
  .option("--verbose", "Show detailed output");

program.parse(process.argv);
const options = program.opts();

async function run() {
  const spinner = ora();
  
  try {
    // Validate environment
    if (!options.noAi) {
      const envCheck = validateEnvironment();
      if (!envCheck.valid) {
        console.error(`❌ ${envCheck.error}`);
        console.log("\n💡 Tip: Create a .env file with OPENROUTER_API_KEY=your_key");
        console.log("   Or run with --no-ai flag to skip AI generation");
        process.exit(1);
      }
    }

    // Load configuration
    const config = loadConfig();
    if (options.verbose) {
      console.log("📝 Configuration loaded:", config);
    }

    // Check git status
    spinner.start("Checking git status...");
    const status = await getGitStatus();
    spinner.stop();

    if (!status.files?.length) {
      console.log("✅ No changes to commit.");
      return;
    }

    // Show status summary
    console.log(`\n📊 Changes detected:`);
    console.log(`   Modified: ${status.modified.length}`);
    console.log(`   Created: ${status.created.length}`);
    console.log(`   Deleted: ${status.deleted.length}`);
    console.log(`   Staged: ${status.staged.length}`);

    // Get git diff
    spinner.start("Getting git diff...");
    const diff = await getGitDiff();
    spinner.stop();

    if (!diff?.trim()) {
      console.log("ℹ️  No meaningful diff detected.");
      return;
    }

    if (options.diff) {
      console.log(`\n${"=".repeat(60)}`);
      console.log("📄 Git Diff:");
      console.log("=".repeat(60));
      console.log(diff);
      console.log("=".repeat(60) + "\n");
    }

    // Generate commit message
    spinner.start("Generating commit message...");
    const aiMessage = await generateCommitMessage(diff, options.noAi, config);
    spinner.succeed("Commit message generated!");

    if (options.verbose) {
      console.log(`AI suggested: "${aiMessage}"`);
    }

    // Ask user for confirmation/editing
    const finalMessage = await askCommitMessage(aiMessage);

    if (!finalMessage?.trim()) {
      console.error("❌ Commit message cannot be empty.");
      process.exit(1);
    }

    // Dry run mode
    if (options.dryRun) {
      console.log("\n🧪 Dry run mode enabled");
      console.log(`📝 Proposed message: ${finalMessage}`);
      console.log("   (No changes will be committed)");
      return;
    }

    // Commit changes
    spinner.start("Committing changes...");
    await commitChanges(finalMessage);
    spinner.succeed("Commit successful!");
    console.log(`✨ Committed: "${finalMessage}"`);

    // Push if requested
    if (options.push) {
      spinner.start("Pushing to remote...");
      try {
        await pushChanges();
        spinner.succeed("Push successful!");
      } catch (err) {
        spinner.fail("Push failed");
        console.error(`⚠️  ${err.message}`);
        process.exit(1);
      }
    }

  } catch (err) {
    spinner.stop();
    console.error("\n❌ Error:", err.message);
    
    if (options.verbose) {
      console.error("\nStack trace:", err.stack);
    }
    
    process.exit(1);
  }
}

async function pushChanges() {
  const { pushToRemote } = await import("../src/commit.js");
  await pushToRemote();
}

run();