import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Commit changes to git
 * @param {string} message - Commit message
 */
export async function commitChanges(message) {
  try {
    const status = await git.status();

    // If nothing staged, add all changes (standard behavior for simple CLI)
    if (status.staged.length === 0) {
      if (status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0) {
        await git.add(".");
      } else {
        throw new Error("No changes detected to commit.");
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
  try {
    const status = await git.status();
    const currentBranch = status.current;

    if (!currentBranch) {
      throw new Error("Cannot determine current branch. Are you in a detached HEAD state?");
    }

    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      throw new Error("No remote repository configured. Run 'git remote add origin <url>' first.");
    }

    await git.push("origin", currentBranch);
  } catch (err) {
    if (err.message.includes("no upstream branch")) {
      const status = await git.status();
      throw new Error(
        `No upstream branch set. Run: git push --set-upstream origin ${status.current}`
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
  try {
    await git.add(files);
  } catch (err) {
    throw new Error(`Failed to stage files: ${err.message}`);
  }
}

