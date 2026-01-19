import simpleGit from "simple-git";

const git = simpleGit();

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
      ignoreLockFiles = true,
    } = options;

    let diffArgs = ["--unified=3"];
    if (staged) diffArgs.push("--staged");

    // Ignore lock files as they are usually huge and not helpful for commit messages
    if (ignoreLockFiles) {
      diffArgs.push("--", ":!package-lock.json", ":!yarn.lock", ":!pnpm-lock.yaml");
    }

    const diff = await git.diff(diffArgs);

    if (!diff.trim()) {
      // If no staged changes and we are allowed to check unstaged
      if (staged && unstaged) {
        const unstagedDiff = await git.diff(["--unified=3"]);
        return truncateDiff(unstagedDiff, maxLines);
      }
      return "";
    }

    return truncateDiff(diff, maxLines);
  } catch (err) {
    throw new Error(
      `Failed to get git diff: ${err.message}`,
    );
  }
}

function truncateDiff(diff, maxLines) {
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

