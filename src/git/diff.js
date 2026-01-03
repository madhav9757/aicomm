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
      maxLines = 500,
      staged = true,
      unstaged = true,
      context = 3,
    } = options;

    let diff = "";

    // Get staged changes
    if (staged) {
      const stagedDiff = await git.diff(["--staged", `--unified=${context}`]);
      if (stagedDiff) {
        diff += stagedDiff;
      }
    }

    // Get unstaged changes
    if (unstaged) {
      const unstagedDiff = await git.diff([`--unified=${context}`]);
      if (unstagedDiff) {
        if (diff) diff += "\n";
        diff += unstagedDiff;
      }
    }

    if (!diff.trim()) {
      return "";
    }

    // Limit diff size
    const lines = diff.split("\n");
    if (lines.length > maxLines) {
      const truncated = lines.slice(0, maxLines).join("\n");
      return (
        truncated +
        `\n\n[... truncated ${lines.length - maxLines} lines ...]`
      );
    }

    return diff;
  } catch (err) {
    throw new Error(
      `Failed to get git diff. Are you inside a git repository? ${err.message}`
    );
  }
}

/**
 * Get diff statistics
 * @returns {Promise<object>} Diff stats
 */
export async function getDiffStats() {
  try {
    const stagedStats = await git.diff(["--staged", "--numstat"]);
    const unstagedStats = await git.diff(["--numstat"]);

    const parseStats = (statText) => {
      if (!statText.trim()) return [];

      return statText
        .trim()
        .split("\n")
        .map((line) => {
          const [added, removed, file] = line.split(/\s+/);
          return {
            file,
            added: added === "-" ? 0 : parseInt(added, 10),
            removed: removed === "-" ? 0 : parseInt(removed, 10),
          };
        });
    };

    const staged = parseStats(stagedStats);
    const unstaged = parseStats(unstagedStats);

    // Calculate totals
    const totalAdded = [...staged, ...unstaged].reduce(
      (sum, s) => sum + s.added,
      0
    );
    const totalRemoved = [...staged, ...unstaged].reduce(
      (sum, s) => sum + s.removed,
      0
    );

    return {
      staged,
      unstaged,
      total: {
        added: totalAdded,
        removed: totalRemoved,
        files: staged.length + unstaged.length,
      },
    };
  } catch (err) {
    throw new Error(`Failed to get diff stats: ${err.message}`);
  }
}

/**
 * Get a summary of changes
 * @returns {Promise<string>} Human-readable summary
 */
export async function getDiffSummary() {
  try {
    const stats = await getDiffStats();

    if (stats.total.files === 0) {
      return "No changes detected";
    }

    const parts = [];

    if (stats.total.added > 0) {
      parts.push(`+${stats.total.added} additions`);
    }

    if (stats.total.removed > 0) {
      parts.push(`-${stats.total.removed} deletions`);
    }

    parts.push(`across ${stats.total.files} file(s)`);

    return parts.join(", ");
  } catch (err) {
    return "Unable to generate summary";
  }
}