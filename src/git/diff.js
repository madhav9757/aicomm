import simpleGit from "simple-git";

const git = simpleGit();

// Default limit (can later be overridden via config)
const MAX_DIFF_LINES = 500;

export async function getGitDiff() {
  try {
    // Get staged changes
    const stagedDiff = await git.diff(["--staged"]);

    // Get unstaged changes
    const unstagedDiff = await git.diff();

    // Combine diffs
    let diff = [stagedDiff, unstagedDiff].filter(Boolean).join("\n");

    if (!diff.trim()) {
      return "";
    }

    // Limit diff size for AI models
    return diff
      .split("\n")
      .slice(0, MAX_DIFF_LINES)
      .join("\n");
  } catch (err) {
    throw new Error(
      "Failed to get git diff. Are you inside a git repository?"
    );
  }
}
