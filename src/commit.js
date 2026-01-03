import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Commit changes to git
 * @param {string} message - Commit message
 */
export async function commitChanges(message) {
  try {
    // Get current status to determine what to add
    const status = await git.status();
    
    // If there are staged files, just commit them
    if (status.staged.length > 0) {
      await git.commit(message);
      return;
    }
    
    // Otherwise, add all changes and commit
    if (status.modified.length > 0 || status.not_added.length > 0 || status.deleted.length > 0) {
      await git.add(".");
      await git.commit(message);
      return;
    }
    
    throw new Error("No changes to commit");
  } catch (err) {
    if (err.message.includes("nothing to commit")) {
      throw new Error("No changes to commit. All changes may already be committed.");
    }
    throw new Error(`Git commit failed: ${err.message}`);
  }
}

/**
 * Push changes to remote
 */
export async function pushToRemote() {
  try {
    // Get current branch
    const status = await git.status();
    const currentBranch = status.current;
    
    if (!currentBranch) {
      throw new Error("Cannot determine current branch");
    }
    
    // Check if remote exists
    const remotes = await git.getRemotes();
    if (remotes.length === 0) {
      throw new Error("No remote repository configured");
    }
    
    // Push to remote
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
 * @param {string[]} files - Array of file paths to stage
 */
export async function stageFiles(files) {
  try {
    if (!files || files.length === 0) {
      throw new Error("No files specified to stage");
    }
    await git.add(files);
  } catch (err) {
    throw new Error(`Failed to stage files: ${err.message}`);
  }
}