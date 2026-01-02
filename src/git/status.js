import simpleGit from "simple-git";

const git = simpleGit();

export async function getGitStatus() {
  return await git.status();
}
