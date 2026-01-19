/**
 * Check if the current directory is a git repository
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateEnvironment() {
  try {
    const { default: simpleGit } = await import("simple-git");
    const git = simpleGit();
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

/**
 * Validate commit message format
 * @param {string} message - The full commit message
 * @returns {{valid: boolean, warnings: string[], cleanedMessage: string}}
 */
export function validateCommitMessage(message) {
  const warnings = [];

  const cleanedMessage = message
    .trim()
    .replace(/^["']|["']$/g, "") // Remove wrapping quotes
    .replace(/^commit message:\s*/i, ""); // Remove "Commit message: " prefix

  if (!cleanedMessage) {
    return {
      valid: false,
      warnings: ["Commit message is empty"],
      cleanedMessage: "",
    };
  }

  const lines = cleanedMessage.split(/\r?\n/);
  const subject = lines[0].trim();

  if (subject.length > 72) {
    warnings.push(
      `Subject line is a bit long (${subject.length} chars). Ideally keep it under 72.`
    );
  }

  const conventionalPattern =
    /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+?\))?:\s.+/i;

  if (!conventionalPattern.test(subject)) {
    warnings.push(
      "Subject doesn't follow conventional format (e.g., 'feat: add login')"
    );
  }

  return {
    valid: true,
    warnings,
    cleanedMessage,
  };
}

/**
 * Check if running in a git repository
 * @returns {Promise<boolean>}
 */
export async function isGitRepository() {
  const result = await validateEnvironment();
  return result.valid;
}

