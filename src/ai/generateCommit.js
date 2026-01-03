import OpenAI from "openai";

/**
 * Sleep helper (ms)
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create OpenAI / OpenRouter client
 */
function createOpenAIClient() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Please set it in your environment."
    );
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost",
      "X-Title": "aicomm",
    },
  });
}

/**
 * Analyze diff to determine commit type
 */
function analyzeDiffType(diff) {
  const lines = diff.toLowerCase();
  
  if (lines.includes("test") || lines.includes("spec.")) {
    return "test";
  }
  if (lines.includes("readme") || lines.includes("doc")) {
    return "docs";
  }
  if (lines.includes("package.json") && lines.includes('"version"')) {
    return "chore";
  }
  if (lines.includes("bugfix") || lines.includes("fix")) {
    return "fix";
  }
  
  // Check for new files/features
  const newFileCount = (diff.match(/\+\+\+ b\//g) || []).length;
  if (newFileCount > 0) {
    return "feat";
  }
  
  return "refactor";
}

/**
 * Generate AI commit message
 * @param {string} diff - Git diff
 * @param {boolean} disableAI - Skip AI and return fallback message
 * @param {object} config - Configuration object
 */
export async function generateCommitMessage(diff, disableAI = false, config = {}) {
  const commitType = analyzeDiffType(diff);
  const fallbackMessage = `${commitType}: update files`;

  if (disableAI) {
    console.log("⚠️  AI disabled. Using fallback commit message.");
    return fallbackMessage;
  }

  const openai = createOpenAIClient();

  // Limit diff lines for AI
  const MAX_DIFF_LINES = config.maxDiffLines ?? 500;
  const diffLines = diff.split("\n");
  const safeDiff = diffLines.slice(0, MAX_DIFF_LINES).join("\n");
  
  // Add truncation notice if diff was cut
  const truncationNotice = diffLines.length > MAX_DIFF_LINES 
    ? `\n[Note: Diff truncated to ${MAX_DIFF_LINES} lines from ${diffLines.length} total]`
    : "";

  const prompt = `You are an expert software engineer creating git commit messages.

Analyze the following git diff and generate a concise, meaningful commit message.

STRICT RULES:
1. Use conventional commits format: <type>: <description>
2. Valid types: feat, fix, chore, refactor, docs, test, style, perf, ci, build
3. Maximum 72 characters total
4. Be specific about what changed (not just "update files")
5. No emojis, no quotes, no markdown
6. One line only
7. Use imperative mood (e.g., "add feature" not "added feature")

EXAMPLES:
- feat: add user authentication with JWT
- fix: resolve memory leak in worker threads
- refactor: simplify database query logic
- docs: update API documentation for v2 endpoints
- test: add unit tests for payment processing

Git diff:
${safeDiff}${truncationNotice}

Output ONLY the commit message, nothing else.`;

  // Helper for retry with exponential backoff
  async function requestAI(retries = 3, delay = 1000) {
    try {
      const completion = await openai.chat.completions.create({
        model: config.model ?? "google/gemini-2.0-flash-exp:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 100,
      });

      let message = completion.choices[0]?.message?.content ?? "";

      // Clean up the message
      message = message
        .replace(/^["'`]+|["'`]+$/g, "") // Remove quotes
        .replace(/^commit message:\s*/i, "") // Remove prefix
        .split("\n")[0] // Take first line
        .trim();

      // Validate conventional commit format
      const conventionalPattern = /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+?\))?:\s.+/;
      
      if (!conventionalPattern.test(message)) {
        console.warn("⚠️  AI message doesn't match conventional format, using fallback");
        return fallbackMessage;
      }

      // Check length
      if (message.length > 72) {
        message = message.slice(0, 69) + "...";
      }

      return message || fallbackMessage;
    } catch (err) {
      // Handle rate limiting with exponential backoff
      if (err.status === 429 && retries > 0) {
        console.warn(`⚠️  Rate limited. Retrying in ${delay}ms... (${retries} attempts left)`);
        await sleep(delay);
        return requestAI(retries - 1, delay * 2);
      }
      
      // Handle other errors
      if (retries > 0 && err.status !== 401 && err.status !== 403) {
        console.warn(`⚠️  Request failed: ${err.message}. Retrying...`);
        await sleep(delay);
        return requestAI(retries - 1, delay * 2);
      }
      
      console.warn("⚠️  AI commit generation failed:", err.message);
      return fallbackMessage;
    }
  }

  return await requestAI();
}