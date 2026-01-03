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
      hasChanges: status.files.length > 0,
      hasStagedChanges: status.staged.length > 0,
      hasUnstagedChanges: 
        status.modified.length > 0 || 
        status.not_added.length > 0 || 
        status.deleted.length > 0,
    };
  } catch (err) {
    throw new Error(`Failed to get git status: ${err.message}`);
  }
}

/**
 * Check if there are uncommitted changes
 * @returns {Promise<boolean>}
 */
export async function hasUncommittedChanges() {
  try {
    const status = await getGitStatus();
    return status.hasChanges;
  } catch {
    return false;
  }
}

/**
 * Get current branch information
 * @returns {Promise<object>} Branch info
 */
export async function getBranchInfo() {
  try {
    const status = await git.status();
    const branches = await git.branch();
    
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