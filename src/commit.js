import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Commit changes to git
 * @param {string} message - Commit message
 */
export async function commitChanges(message) {
  try {
    await git.add(".");
    await git.commit(message);
  } catch (err) {
    throw new Error(`Git commit failed: ${err.message}`);
  }
}
