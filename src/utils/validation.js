import simpleGit from "simple-git";

// Initialize git instance once for the module to reduce overhead
const git = simpleGit();

/**
 * Check if the current directory is a git repository
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
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

/**
 * Check if running in a git repository
 * @returns {Promise<boolean>}
 */
export async function isGitRepository() {
  const result = await validateEnvironment();
  return result.valid;
}

/**
 * Validate commit message format
 * @param {string} message - The full commit message
 * @returns {{valid: boolean, warnings: string[], cleanedMessage: string}}
 */
export function validateCommitMessage(message) {
  const warnings = [];

  // Aggressive cleaning for AI hallucinations
  const cleanedMessage = (message || "")
    .trim()
    .replace(/^["'`]|["'`]$/g, "") // Remove wrapping quotes or backticks
    .replace(/^(commit message|message|subject):\s*/i, ""); // Remove common AI prefixes

  if (!cleanedMessage) {
    return {
      valid: false,
      warnings: ["Commit message is empty."],
      cleanedMessage: "",
    };
  }

  const lines = cleanedMessage.split(/\r?\n/);
  const subject = lines[0].trim();

  // Validate subject line length (72 chars is the Git standard)
  if (subject.length > 72) {
    warnings.push(
      `Subject line is long (${subject.length} chars). Conventionally keep it under 72.`
    );
  }

  // Enhanced conventional pattern to support scopes like (deps-dev) or (ui/button)
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