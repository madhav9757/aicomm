import fetch from "node-fetch"; // Or use global fetch if on Node 18+

/**
 * Validate environment setup for Ollama
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateEnvironment() {
  try {
    // We check the standard Ollama port
    const response = await fetch("http://127.0.0.1:11434/api/tags");

    if (response.ok) {
      return { valid: true };
    }

    return {
      valid: false,
      error:
        "Ollama is responding but returned an error. Try restarting the Ollama app.",
    };
  } catch (err) {
    // If the fetch fails, the server is likely not running
    return {
      valid: false,
      error:
        "Ollama is not running. Please start the Ollama app or run 'ollama serve' in your terminal.",
    };
  }
}

/**
 * Validate commit message format (Supporting Long Body)
 * @param {string} message - The full commit message from AI/User
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
  const body = lines.slice(1).join("\n").trim();

  if (subject.length > 600) {
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

  if (body) {
    if (lines[1] && lines[1].trim() !== "") {
      warnings.push(
        "Git best practice: Add a blank line between the subject and the body."
      );
    }
  } else {
    warnings.push(
      "Message is a one-liner. Consider a longer body for complex changes."
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
  try {
    const { default: simpleGit } = await import("simple-git");
    const git = simpleGit();
    await git.revparse(["--git-dir"]);
    return true;
  } catch {
    return false;
  }
}
