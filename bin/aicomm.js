#!/usr/bin/env node
import { Command } from "commander";
import "dotenv/config";

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

(async () => {
  try {
    // Load user config (.aicommrc)
    const config = loadConfig();

    // Get git status
    const status = await getGitStatus();

    if (!status.files || status.files.length === 0) {
      console.log("✅ No changes to commit.");
      process.exit(0);
    }

    // Get git diff
    const diff = await getGitDiff();

    if (!diff || !diff.trim()) {
      console.log("ℹ No meaningful diff detected.");
      process.exit(0);
    }

    // Show diff if requested
    if (options.diff) {
      console.log("\n📄 Git Diff:\n");
      console.log(diff);
      console.log("\n-----------------------------\n");
    }

    // Generate commit message (AI or fallback)
    const aiMessage = await generateCommitMessage(diff, options.noAi);

    // Ask user to confirm / edit
    const finalMessage = await askCommitMessage(aiMessage);

    if (!finalMessage || !finalMessage.trim()) {
      console.log("❌ Commit message cannot be empty.");
      process.exit(1);
    }

    // Dry-run mode
    if (options.dryRun) {
      console.log("\n🧪 Dry run mode enabled");
      console.log("Proposed commit message:");
      console.log(`➡ ${finalMessage}`);
      process.exit(0);
    }

    // Commit changes
    await commitChanges(finalMessage);
    console.log("🎉 Commit successful!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.stack || err.message);
    process.exit(1);
  }
})();
