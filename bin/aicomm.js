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

const program = new Command();
program
  .name("aicomm")
  .description("AI-powered git commit assistant")
  .version("1.0.0")
  .option("--dry-run", "Generate commit message without committing")
  .option("--diff", "Show git diff before committing")
  .option("--no-ai", "Skip AI generation and use fallback commit message");

program.parse(process.argv);
const options = program.opts();

async function run() {
  try {
    const config = loadConfig();
    const status = await getGitStatus();

    if (!status.files?.length) {
      console.log("✅ No changes to commit.");
      return;
    }

    const diff = await getGitDiff();
    if (!diff?.trim()) {
      console.log("ℹ No meaningful diff detected.");
      return;
    }

    if (options.diff) {
      console.log(`\n📄 Git Diff:\n\n${diff}\n${"-".repeat(30)}\n`);
    }

    // UX: Add a spinner during AI generation
    const spinner = ora("Generating commit message...").start();
    const aiMessage = await generateCommitMessage(diff, options.noAi);
    spinner.stop();

    const finalMessage = await askCommitMessage(aiMessage);

    if (!finalMessage?.trim()) {
      console.error("❌ Commit message cannot be empty.");
      process.exit(1);
    }

    if (options.dryRun) {
      console.log("\n🧪 Dry run mode enabled");
      console.log(`Proposed message: ${finalMessage}`);
      return;
    }

    await commitChanges(finalMessage);
    console.log("🎉 Commit successful!");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
