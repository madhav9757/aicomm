/**
 * Validate environment setup
 * @returns {{valid: boolean, error?: string}}
 */
export function validateEnvironment() {
  // Check for API key
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      valid: false,
      error: "OPENROUTER_API_KEY is not set in environment variables",
    };
  }

  // Check API key format (basic validation)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey.length < 10) {
    return {
      valid: false,
      error: "OPENROUTER_API_KEY appears to be invalid (too short)",
    };
  }

  return { valid: true };
}

/**
 * Validate commit message format
 * @param {string} message - Commit message to validate
 * @returns {{valid: boolean, warnings: string[]}}
 */
export function validateCommitMessage(message) {
  const warnings = [];
  
  if (!message || !message.trim()) {
    return {
      valid: false,
      warnings: ["Commit message is empty"],
    };
  }

  const trimmed = message.trim();

  // Check length
  if (trimmed.length > 72) {
    warnings.push(`Message length (${trimmed.length}) exceeds recommended 72 characters`);
  }

  // Check for conventional commit format
  const conventionalPattern = /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+?\))?:\s.+/;
  if (!conventionalPattern.test(trimmed)) {
    warnings.push("Message doesn't follow conventional commits format");
  }

  // Check for imperative mood (basic check)
  const firstWord = trimmed.split(":")[1]?.trim().split(" ")[0]?.toLowerCase();
  const pastTenseIndicators = ["added", "fixed", "updated", "removed", "changed"];
  if (firstWord && pastTenseIndicators.includes(firstWord)) {
    warnings.push("Consider using imperative mood (e.g., 'add' instead of 'added')");
  }

  return {
    valid: true,
    warnings,
  };
}

/**
 * Check if running in a git repository
 * @returns {Promise<boolean>}
 */
export async function isGitRepository() {
  try {
    const { default: simpleGit } = await import("simple-git");
    const git = simpleGit();
    await git.revparse(["--git-dir"]);
    return true;
  } catch {
    return false;
  }
}