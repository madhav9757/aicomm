import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

const git = simpleGit();

export const LOCK_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
]);

export const IGNORE_EXTENSIONS = new Set([
  // Minified files
  ".min.js",
  ".min.css",
  ".bundle.js",
  // Source maps
  ".map",
  // Vector graphics & Images
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".bmp",
  ".tiff",
  ".avif",
  // Fonts & Documents
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  // Binaries & Archives
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".bin",
  ".mp3",
  ".mp4",
  ".mov",
  ".avi",
]);

export const IGNORE_DIRS = [
  "dist/",
  "build/",
  ".next/",
  "out/",
  "coverage/",
  ".cache/",
  "node_modules/",
];

/**
 * Check if a file should be ignored from diff content
 * @param {string} filePath
 * @returns {{ ignored: boolean, reason?: string }}
 */
export function getFileIgnoreStatus(filePath) {
  if (!filePath) return { ignored: false };

  const normalized = filePath.replace(/\\/g, "/");
  const fileName = path.basename(normalized);

  // Check lock files
  if (LOCK_FILES.has(fileName)) {
    return { ignored: true, reason: "Lockfile" };
  }

  // Check directories
  for (const dir of IGNORE_DIRS) {
    if (normalized.startsWith(dir) || normalized.includes(`/${dir}`)) {
      return { ignored: true, reason: `Build/cache directory (${dir})` };
    }
  }

  // Check compound extensions like .min.js or .min.css
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".min.js")) return { ignored: true, reason: "Minified JS" };
  if (lowerName.endsWith(".min.css")) return { ignored: true, reason: "Minified CSS" };
  if (lowerName.endsWith(".map")) return { ignored: true, reason: "Source map" };

  const ext = path.extname(normalized).toLowerCase();
  if (IGNORE_EXTENSIONS.has(ext)) {
    return { ignored: true, reason: `${ext.replace(".", "").toUpperCase()} asset/binary` };
  }

  return { ignored: false };
}

/**
 * Split unified diff text into individual per-file blocks
 * @param {string} rawDiff
 * @returns {Array<{ file: string, content: string, lines: string[], lineCount: number, ignored: boolean, ignoreReason?: string }>}
 */
export function parseDiffIntoFiles(rawDiff) {
  if (!rawDiff || !rawDiff.trim()) return [];

  const fileChunks = [];
  const rawBlocks = rawDiff.split(/(?=^diff --git )/m);

  for (const block of rawBlocks) {
    if (!block.trim()) continue;

    const gitDiffMatch = block.match(/^diff --git a\/(.+?)\s+b\/(.+)$/m);
    let filePath = "";
    if (gitDiffMatch) {
      filePath = gitDiffMatch[2].trim();
    } else {
      const plusMatch = block.match(/^\+\+\+\s+b\/(.+)$/m);
      if (plusMatch) {
        filePath = plusMatch[1].trim();
      }
    }

    if (!filePath) {
      filePath = "unknown";
    }

    const { ignored, reason } = getFileIgnoreStatus(filePath);
    const lines = block.split(/\r?\n/);

    fileChunks.push({
      file: filePath,
      content: block,
      lines,
      lineCount: lines.length,
      ignored,
      ignoreReason: reason,
    });
  }

  return fileChunks;
}

/**
 * Generate diff blocks for untracked files
 * @param {string[]} untrackedFiles
 * @returns {Array<{ file: string, content: string, lines: string[], lineCount: number, ignored: boolean, ignoreReason?: string, isUntracked: boolean }>}
 */
export function getUntrackedFileBlocks(untrackedFiles = []) {
  if (!untrackedFiles || untrackedFiles.length === 0) return [];

  const blocks = [];

  for (const filePath of untrackedFiles) {
    const normalized = filePath.replace(/\\/g, "/");
    const { ignored, reason } = getFileIgnoreStatus(normalized);

    if (ignored) {
      blocks.push({
        file: normalized,
        content: `--- /dev/null\n+++ b/${normalized}\n[New file - ${reason || "Ignored from diff"}]`,
        lines: [
          `--- /dev/null`,
          `+++ b/${normalized}`,
          `[New file - ${reason || "Ignored from diff"}]`,
        ],
        lineCount: 3,
        ignored: true,
        ignoreReason: reason,
        isUntracked: true,
      });
      continue;
    }

    try {
      if (!fs.existsSync(filePath)) continue;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) continue;

      if (stats.size > 200 * 1024) {
        const line = `[New large file (${Math.round(stats.size / 1024)} KB) - omitted from diff]`;
        blocks.push({
          file: normalized,
          content: `--- /dev/null\n+++ b/${normalized}\n${line}`,
          lines: [`--- /dev/null`, `+++ b/${normalized}`, line],
          lineCount: 3,
          ignored: true,
          ignoreReason: "Large file (>200KB)",
          isUntracked: true,
        });
        continue;
      }

      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("\0")) {
        const line = `[New binary file - omitted from diff]`;
        blocks.push({
          file: normalized,
          content: `--- /dev/null\n+++ b/${normalized}\n${line}`,
          lines: [`--- /dev/null`, `+++ b/${normalized}`, line],
          lineCount: 3,
          ignored: true,
          ignoreReason: "Binary content",
          isUntracked: true,
        });
        continue;
      }

      const rawLines = content.split(/\r?\n/);
      const diffLines = [
        `--- /dev/null`,
        `+++ b/${normalized}`,
        `@@ -0,0 +1,${rawLines.length} @@`,
        ...rawLines.map((l) => `+${l}`),
      ];

      blocks.push({
        file: normalized,
        content: diffLines.join("\n"),
        lines: diffLines,
        lineCount: diffLines.length,
        ignored: false,
        isUntracked: true,
      });
    } catch {
      blocks.push({
        file: normalized,
        content: `--- /dev/null\n+++ b/${normalized}\n[New untracked file]`,
        lines: [`--- /dev/null`, `+++ b/${normalized}`, `[New untracked file]`],
        lineCount: 3,
        ignored: false,
        isUntracked: true,
      });
    }
  }

  return blocks;
}

/**
 * Budget and truncate diff blocks proportionally
 * @param {Array} fileBlocks
 * @param {number} maxLines
 * @returns {string} Budgeted diff string
 */
export function budgetAndFormatDiffs(fileBlocks, maxLines = 300) {
  if (!fileBlocks || fileBlocks.length === 0) return "";

  // Separate active text diffs from ignored files
  const activeBlocks = fileBlocks.filter((b) => !b.ignored);
  if (activeBlocks.length === 0) {
    return fileBlocks.map((b) => b.content).join("\n\n");
  }

  const totalActiveLines = activeBlocks.reduce((sum, b) => sum + b.lineCount, 0);

  // If within budget, include all lines directly
  if (totalActiveLines <= maxLines) {
    return activeBlocks.map((b) => b.content).join("\n\n");
  }

  // Proportional line budgeting across active files
  const numFiles = activeBlocks.length;
  const minLinesPerFile = Math.max(12, Math.floor(maxLines / (numFiles * 2)));
  const maxLinesPerFile = Math.max(40, Math.floor(maxLines * 0.45));

  const budgetedChunks = [];

  for (const block of activeBlocks) {
    const share = Math.round((block.lineCount / totalActiveLines) * maxLines);
    const allocatedLines = Math.max(minLinesPerFile, Math.min(share, maxLinesPerFile, block.lineCount));

    if (block.lineCount <= allocatedLines) {
      budgetedChunks.push(block.content);
    } else {
      const keptLines = block.lines.slice(0, allocatedLines);
      const truncatedCount = block.lineCount - allocatedLines;
      keptLines.push(`... [${truncatedCount} lines truncated for ${block.file}] ...`);
      budgetedChunks.push(keptLines.join("\n"));
    }
  }

  return budgetedChunks.join("\n\n");
}

/**
 * Build a concise summary header of all changed files
 * @param {Array} diffSummaryFiles - files from git.diffSummary() or status
 * @param {Array} untrackedBlocks - untracked file blocks
 * @returns {string} Summary header
 */
export function buildChangesSummaryHeader(diffSummaryFiles = [], untrackedBlocks = []) {
  const lines = ["CHANGES SUMMARY:"];

  for (const file of diffSummaryFiles) {
    const { ignored, reason } = getFileIgnoreStatus(file.file);
    let changeTag = `+${file.insertions || 0}/-${file.deletions || 0}`;
    if (file.binary) changeTag = "Binary";

    if (ignored) {
      lines.push(`- ${file.file} (${changeTag}) [${reason || "Ignored from diff"}]`);
    } else {
      lines.push(`- ${file.file} (${changeTag})`);
    }
  }

  for (const untracked of untrackedBlocks) {
    if (untracked.ignored) {
      lines.push(`- ${untracked.file} (Untracked) [${untracked.ignoreReason || "Ignored from diff"}]`);
    } else {
      const additions = Math.max(0, untracked.lineCount - 3);
      lines.push(`- ${untracked.file} (+${additions}/-0) (Untracked)`);
    }
  }

  return lines.join("\n");
}

/**
 * Backward compatibility helper for untracked diff generation
 * @param {string[]} untrackedFiles
 * @returns {string}
 */
export function generateUntrackedDiff(untrackedFiles = []) {
  const blocks = getUntrackedFileBlocks(untrackedFiles);
  return blocks.map((b) => b.content).join("\n\n");
}

/**
 * Get git diff with intelligent formatting, summary headers, and proportional budgeting
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
    } = options;

    let diffArgs = ["--unified=3"];
    if (staged) diffArgs.push("--staged");

    // Fetch diff and diff summary concurrently
    let [rawDiff, summary] = await Promise.all([
      git.diff(diffArgs),
      git.diffSummary(diffArgs).catch(() => ({ files: [] })),
    ]);

    // If staged diff is empty and unstaged is enabled
    if (!rawDiff.trim() && staged && unstaged) {
      const unstagedArgs = ["--unified=3"];
      [rawDiff, summary] = await Promise.all([
        git.diff(unstagedArgs),
        git.diffSummary(unstagedArgs).catch(() => ({ files: [] })),
      ]);
    }

    // Parse git diff into per-file chunks
    const diffBlocks = parseDiffIntoFiles(rawDiff);

    // Handle untracked files
    let untrackedBlocks = [];
    if (includeUntracked && (unstaged || untrackedFiles)) {
      let filesToInspect = untrackedFiles;
      if (!filesToInspect && unstaged) {
        const status = await git.status();
        filesToInspect = status.not_added;
      }
      if (filesToInspect && filesToInspect.length > 0) {
        untrackedBlocks = getUntrackedFileBlocks(filesToInspect);
      }
    }

    // If nothing changed across diffs and untracked
    if (diffBlocks.length === 0 && untrackedBlocks.length === 0) {
      return "";
    }

    // Generate summary header
    const summaryHeader = buildChangesSummaryHeader(summary.files || [], untrackedBlocks);

    // Combine all file blocks and budget them proportionally
    const allBlocks = [...diffBlocks, ...untrackedBlocks];
    const budgetedDiff = budgetAndFormatDiffs(allBlocks, maxLines);

    if (!budgetedDiff.trim()) {
      return summaryHeader;
    }

    return `${summaryHeader}\n\n${budgetedDiff}`;
  } catch (err) {
    throw new Error(`Failed to get git diff: ${err.message}`);
  }
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

