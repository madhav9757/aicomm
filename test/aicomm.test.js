import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { saveApiKey, getApiKey, getMaskedApiKey, readConfig } from "../src/utils/config.js";
import { validateCommitMessage } from "../src/utils/validation.js";
import { generateUntrackedDiff } from "../src/git/diff.js";

describe("Config Utility", () => {
  const originalKey = getApiKey();

  after(() => {
    // Restore key if it originally existed
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

describe("Diff Generation & Untracked Files", () => {
  const tempDir = path.join(os.tmpdir(), "aicomm-test-" + Date.now());
  const sampleFile = path.join(tempDir, "sample.js");
  const lockFile = path.join(tempDir, "package-lock.json");

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(sampleFile, "console.log('hello world');\nconst x = 10;", "utf8");
    fs.writeFileSync(lockFile, '{"lockfileVersion": 3}', "utf8");
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should generate diff representation for untracked files", () => {
    const diff = generateUntrackedDiff([sampleFile]);
    assert.ok(diff.includes("--- /dev/null"));
    assert.ok(diff.includes("+console.log('hello world');"));
    assert.ok(diff.includes("+const x = 10;"));
  });

  it("should ignore lockfiles by default", () => {
    const diff = generateUntrackedDiff([sampleFile, lockFile], true);
    assert.ok(!diff.includes("lockfileVersion"));
    assert.ok(diff.includes("sample.js"));
  });
});
