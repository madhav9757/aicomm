import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { saveApiKey, getApiKey, getMaskedApiKey } from "../src/utils/config.js";
import { validateCommitMessage } from "../src/utils/validation.js";
import {
  generateUntrackedDiff,
  getFileIgnoreStatus,
  parseDiffIntoFiles,
  budgetAndFormatDiffs,
  buildChangesSummaryHeader,
} from "../src/git/diff.js";

describe("Config Utility", () => {
  const originalKey = getApiKey();

  after(() => {
    if (originalKey) {
      saveApiKey(originalKey);
    }
  });

  it("should save and retrieve API key", () => {
    saveApiKey("test_gemini_api_key_12345");
    assert.equal(getApiKey(), "test_gemini_api_key_12345");
  });

  it("should mask API key properly", () => {
    saveApiKey("test_gemini_api_key_12345");
    const masked = getMaskedApiKey();
    assert.equal(masked, "test...2345");
  });

  it("should return null/masked gracefully for short keys", () => {
    saveApiKey("1234");
    assert.equal(getMaskedApiKey(), "********");
  });
});

describe("Validation Utility", () => {
  it("should validate a proper conventional commit message", () => {
    const result = validateCommitMessage("feat(auth): implement google login");
    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 0);
    assert.equal(result.cleanedMessage, "feat(auth): implement google login");
  });

  it("should warn on non-conventional commit messages", () => {
    const result = validateCommitMessage("updated the buttons on the landing page");
    assert.equal(result.valid, true);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Conventional Commits/);
  });

  it("should warn on long subject lines (> 72 characters)", () => {
    const longMessage = "feat: " + "a".repeat(75);
    const result = validateCommitMessage(longMessage);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes("72")));
  });

  it("should reject empty commit messages", () => {
    const result = validateCommitMessage("   ");
    assert.equal(result.valid, false);
    assert.equal(result.cleanedMessage, "");
  });
});

describe("File Ignore & Filtering", () => {
  it("should ignore lock files", () => {
    assert.equal(getFileIgnoreStatus("package-lock.json").ignored, true);
    assert.equal(getFileIgnoreStatus("pnpm-lock.yaml").ignored, true);
    assert.equal(getFileIgnoreStatus("bun.lockb").ignored, true);
  });

  it("should ignore minified files and source maps", () => {
    assert.equal(getFileIgnoreStatus("dist/bundle.min.js").ignored, true);
    assert.equal(getFileIgnoreStatus("styles.min.css").ignored, true);
    assert.equal(getFileIgnoreStatus("app.js.map").ignored, true);
  });

  it("should ignore SVGs, images, and binary files", () => {
    assert.equal(getFileIgnoreStatus("assets/logo.svg").ignored, true);
    assert.equal(getFileIgnoreStatus("public/banner.png").ignored, true);
    assert.equal(getFileIgnoreStatus("font.woff2").ignored, true);
  });

  it("should ignore build output directories", () => {
    assert.equal(getFileIgnoreStatus("dist/index.html").ignored, true);
    assert.equal(getFileIgnoreStatus("build/static/js/main.js").ignored, true);
    assert.equal(getFileIgnoreStatus(".next/server/page.js").ignored, true);
  });

  it("should NOT ignore standard source files", () => {
    assert.equal(getFileIgnoreStatus("src/index.js").ignored, false);
    assert.equal(getFileIgnoreStatus("components/Button.tsx").ignored, false);
    assert.equal(getFileIgnoreStatus("README.md").ignored, false);
  });
});

describe("Smart Diff Budgeting & Summary Headers", () => {
  it("should build a summary header with changes and annotations", () => {
    const diffSummaryFiles = [
      { file: "src/app.js", insertions: 15, deletions: 2, binary: false },
      { file: "public/icon.svg", insertions: 100, deletions: 0, binary: false },
    ];
    const untrackedBlocks = [
      { file: "docs/readme.md", lineCount: 13, ignored: false },
    ];

    const header = buildChangesSummaryHeader(diffSummaryFiles, untrackedBlocks);
    assert.ok(header.includes("CHANGES SUMMARY:"));
    assert.ok(header.includes("src/app.js (+15/-2)"));
    assert.ok(header.includes("public/icon.svg (+100/-0) [SVG asset/binary]"));
    assert.ok(header.includes("docs/readme.md (+10/-0) (Untracked)"));
  });

  it("should proportionally budget large diffs across multiple files", () => {
    const hugeLines = Array.from({ length: 500 }, (_, i) => `+line ${i}`);
    const smallLines = Array.from({ length: 15 }, (_, i) => `+small line ${i}`);

    const fileBlocks = [
      { file: "huge.js", lines: hugeLines, lineCount: 500, ignored: false, content: hugeLines.join("\n") },
      { file: "small.js", lines: smallLines, lineCount: 15, ignored: false, content: smallLines.join("\n") },
    ];

    const budgeted = budgetAndFormatDiffs(fileBlocks, 100);
    assert.ok(budgeted.includes("small line 14"));
    assert.ok(budgeted.includes("lines truncated for huge.js"));
  });

  it("should parse unified diff text into individual files", () => {
    const rawDiff = `diff --git a/file1.js b/file1.js\n--- a/file1.js\n+++ b/file1.js\n@@ -1 +1 @@\n-old\n+new\ndiff --git a/file2.js b/file2.js\n--- a/file2.js\n+++ b/file2.js\n@@ -1 +1 @@\n+added`;
    const files = parseDiffIntoFiles(rawDiff);
    assert.equal(files.length, 2);
    assert.equal(files[0].file, "file1.js");
    assert.equal(files[1].file, "file2.js");
  });
});
