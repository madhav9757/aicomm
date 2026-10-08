import simpleGit from "simple-git";

const git = simpleGit();

export async function commitChanges(message) {
  try {
    const status = await git.status();

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

export async function pushToRemote({ setUpstream = false } = {}) {
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

    const remoteName = remotes.find((r) => r.name === "origin") ? "origin" : remotes[0].name;

    if (setUpstream || !status.tracking) {
      await git.push(["--set-upstream", remoteName, currentBranch]);
    } else {
      await git.push(remoteName, currentBranch);
    }
  } catch (err) {
    if (err.message.includes("no upstream branch") || err.message.includes("has no upstream branch")) {
      const branchToShow = currentBranch || "YOUR_BRANCH";
      throw new Error(
        `No upstream branch set. Run: git push --set-upstream origin ${branchToShow}`
      );
    }
    throw new Error(`Git push failed: ${err.message}`);
  }
}

export async function stageFiles(files) {
  if (!files || (Array.isArray(files) && files.length === 0)) {
    return;
  }

  try {
    await git.add(files);
  } catch (err) {
    throw new Error(`Failed to stage files: ${err.message}`);
  }
}