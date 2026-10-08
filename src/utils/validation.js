import simpleGit from "simple-git";

const git = simpleGit();

export async function validateEnvironment() {
  try {
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      return {
        valid: false,
        error: "Not a git repository. Please run this command inside a git project.",
      };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `Environment validation failed: ${err.message}`,
    };
  }
}

export function validateCommitMessage(message) {
  const warnings = [];

  const cleanedMessage = (message || "")
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/^(commit message|message|subject):\s*/i, "");

  if (!cleanedMessage) {
    return {
      valid: false,
      warnings: ["Commit message is empty."],
      cleanedMessage: "",
    };
  }

  const lines = cleanedMessage.split(/\r?\n/);
  const subject = lines[0].trim();

  if (subject.length > 72) {
    warnings.push(
      `Subject line is long (${subject.length} chars). Conventionally keep it under 72.`
    );
  }

  const conventionalPattern =
    /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\([a-zA-Z0-9_\-\/]+\))?:\s.+/i;

  if (!conventionalPattern.test(subject)) {
    warnings.push(
      "Subject does not follow the Conventional Commits format (e.g., 'feat: add login')."
    );
  }

  return {
    valid: true,
    warnings,
    cleanedMessage,
  };
}