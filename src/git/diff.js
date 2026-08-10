import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

const LOCK_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip",
  ".tar", ".gz", ".exe", ".dll", ".so", ".dylib", ".woff", ".woff2",
  ".ttf", ".eot", ".mp3", ".mp4", ".mov", ".avi", ".wasm", ".bin"
]);

/**
 * Check if a file should be treated as binary or skipped
 * @param {string} filePath
 * @returns {boolean}
 */
function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Generate diff representation for untracked files
 * @param {string[]} untrackedFiles
 * @param {boolean} ignoreLockFiles
 * @returns {string}
 */
export function generateUntrackedDiff(untrackedFiles = [], ignoreLockFiles = true) {
  if (!untrackedFiles || untrackedFiles.length === 0) return "";

  const chunks = [];

  for (const filePath of untrackedFiles) {
    const fileName = path.basename(filePath);
    if (ignoreLockFiles && LOCK_FILES.includes(fileName)) {
      continue;
    }

    if (isBinaryFile(filePath)) {
      chunks.push(`--- /dev/null\n+++ b/${filePath}\n[New binary file]`);
      continue;
    }

    try {
      if (!fs.existsSync(filePath)) continue;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) continue;

      if (stats.size > 200 * 1024) {
        chunks.push(`--- /dev/null\n+++ b/${filePath}\n[New large file (${Math.round(stats.size / 1024)} KB)]`);
        continue;
      }

      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("\0")) {
        chunks.push(`--- /dev/null\n+++ b/${filePath}\n[New binary file]`);
        continue;
      }

      const lines = content.split(/\r?\n/);
      const diffLines = lines.map((line) => `+${line}`).join("\n");
      chunks.push(`--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${diffLines}`);
    } catch {
      chunks.push(`--- /dev/null\n+++ b/${filePath}\n[New untracked file]`);
    }
  }

  return chunks.join("\n\n");
}

/**
 * Get git diff with intelligent formatting
 * @param {object} options - Options for diff
 * @returns {Promise<string>} Git diff output
 */
export async function getGitDiff(options = {}) {
  try {
    const {
      maxLines = 300,
      staged = true,
      unstaged = false,
      includeUntracked = true,
      untrackedFiles = null,
      ignoreLockFiles = true,
    } = options;

    let diffArgs = ["--unified=3"];
    if (staged) diffArgs.push("--staged");

    // Ignore lock files as they are usually huge and not helpful for commit messages
    if (ignoreLockFiles) {
      diffArgs.push("--", ":!package-lock.json", ":!yarn.lock", ":!pnpm-lock.yaml", ":!bun.lockb");
    }

    let diff = await git.diff(diffArgs);

    // If no staged changes and we are allowed to check unstaged
    if (!diff.trim() && staged && unstaged) {
      const unstagedArgs = ["--unified=3"];
      if (ignoreLockFiles) {
        unstagedArgs.push("--", ":!package-lock.json", ":!yarn.lock", ":!pnpm-lock.yaml", ":!bun.lockb");
      }
      diff = await git.diff(unstagedArgs);
    }

    // Include untracked files if unstaged changes are enabled or explicit untracked files provided
    if (includeUntracked && (unstaged || untrackedFiles)) {
      let filesToDiff = untrackedFiles;
      if (!filesToDiff && unstaged) {
        const status = await git.status();
        filesToDiff = status.not_added;
      }

      if (filesToDiff && filesToDiff.length > 0) {
        const untrackedDiff = generateUntrackedDiff(filesToDiff, ignoreLockFiles);
        if (untrackedDiff) {
          diff = diff?.trim() ? `${diff}\n\n${untrackedDiff}` : untrackedDiff;
        }
      }
    }

    return truncateDiff(diff || "", maxLines);
  } catch (err) {
    throw new Error(
      `Failed to get git diff: ${err.message}`,
    );
  }
}

function truncateDiff(diff, maxLines) {
  if (!diff) return "";
  const lines = diff.split("\n");
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join("\n") + `\n\n[... truncated for brevity ...]`;
  }
  return diff;
}

/**
 * Get diff statistics
 * @returns {Promise<object>} Diff stats
 */
export async function getDiffStats() {
  try {
    const status = await git.status();

    return {
      modified: status.modified,
      created: status.not_added,
      deleted: status.deleted,
      staged: status.staged,
      total: {
        files: status.files.length,
      },
    };
  } catch (err) {
    throw new Error(`Failed to get diff stats: ${err.message}`);
  }
}

