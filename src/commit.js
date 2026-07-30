import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Commit changes to git
 * @param {string} message - Commit message
 */
export async function commitChanges(message) {
  try {
    const status = await git.status();

    // If nothing is staged, auto-stage everything (common CLI convenience)
    if (status.staged.length === 0) {
      if (!status.isClean()) {
        await git.add(".");
      } else {
        throw new Error("No changes detected in the repository to commit.");
      }
    }

    await git.commit(message);
  } catch (err) {
    if (err.message.includes("nothing to commit")) {
      throw new Error("No changes to commit. Your workspace might be clean.");
    }
    throw new Error(`Git commit failed: ${err.message}`);
  }
}

/**
 * Push changes to remote
 */
export async function pushToRemote() {
  let currentBranch;

  try {
    const status = await git.status();
    currentBranch = status.current;

    if (!currentBranch) {
      throw new Error("Cannot determine current branch. Are you in a detached HEAD state?");
    }

    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      throw new Error("No remote repository configured. Run 'git remote add origin <url>' first.");
    }

    // Default to 'origin' if it exists, otherwise intelligently pick the first available remote
    const remoteName = remotes.find((r) => r.name === "origin") ? "origin" : remotes[0].name;

    await git.push(remoteName, currentBranch);
  } catch (err) {
    if (err.message.includes("no upstream branch") || err.message.includes("has no upstream branch")) {
      // Re-use currentBranch from the try block to avoid a redundant git.status() call
      const branchToShow = currentBranch || "YOUR_BRANCH";
      throw new Error(
        `No upstream branch set. Run: git push --set-upstream origin ${branchToShow}`
      );
    }
    throw new Error(`Git push failed: ${err.message}`);
  }
}

/**
 * Stage specific files
 * @param {string|string[]} files - File path(s) to stage
 */
export async function stageFiles(files) {
  // Prevent git errors if called with empty arguments
  if (!files || (Array.isArray(files) && files.length === 0)) {
    return;
  }

  try {
    await git.add(files);
  } catch (err) {
    throw new Error(`Failed to stage files: ${err.message}`);
  }
}