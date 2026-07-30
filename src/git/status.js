import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Get git status with enhanced information
 * @returns {Promise<object>} Enhanced status object
 */
export async function getGitStatus() {
  try {
    const status = await git.status();

    return {
      ...status,
      hasChanges: !status.isClean(),
      hasStagedChanges: status.staged.length > 0,
      hasUnstagedChanges:
        status.modified.length > 0 ||
        status.not_added.length > 0 ||
        status.deleted.length > 0 ||
        status.renamed.length > 0,
    };
  } catch (err) {
    throw new Error(`Failed to get git status: ${err.message}`);
  }
}

/**
 * Check if repository is clean (no uncommitted changes)
 * @returns {Promise<boolean>}
 */
export async function isClean() {
  try {
    const status = await git.status();
    return status.isClean();
  } catch {
    return false;
  }
}

/**
 * Check if there are uncommitted changes
 * @returns {Promise<boolean>}
 */
export async function hasUncommittedChanges() {
  return !(await isClean());
}

/**
 * Get current branch information
 * @returns {Promise<object>} Branch info
 */
export async function getBranchInfo() {
  try {
    // Execute git queries concurrently to minimize I/O latency
    const [status, branches] = await Promise.all([
      git.status(),
      git.branch()
    ]);

    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      branches: branches.all,
    };
  } catch (err) {
    throw new Error(`Failed to get branch info: ${err.message}`);
  }
}