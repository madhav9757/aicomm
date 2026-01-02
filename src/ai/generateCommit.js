import OpenAI from "openai";
import { loadConfig } from "../config/loadConfig.js";

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
 * Generate AI commit message
 * @param {string} diff - Git diff
 * @param {boolean} disableAI - Skip AI and return fallback message
 */
export async function generateCommitMessage(diff, disableAI = false) {
  const fallbackMessage = "chore: update files";

  if (disableAI) {
    console.log("⚠️ AI disabled. Using fallback commit message.");
    return fallbackMessage;
  }

  const config = loadConfig();
  const openai = createOpenAIClient();

  // Limit diff lines for AI
  const MAX_DIFF_LINES = config.maxDiffLines ?? 500;
  const safeDiff = diff.split("\n").slice(0, MAX_DIFF_LINES).join("\n");

  const prompt = `
You are an expert software engineer.

Generate a concise git commit message.

Rules:
- Use conventional commits (feat, fix, chore, refactor, docs, test)
- Max 72 characters
- No emojis
- Output ONLY the commit message
- One single line

Git diff:
${safeDiff}
`;

  // Helper for retry
  async function requestAI(retries = 1) {
    try {
      const completion = await openai.chat.completions.create({
        model: config.model ?? "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      let message = completion.choices[0]?.message?.content ?? "";

      message = message.replace(/["'`]/g, "").split("\n")[0].trim();

      // Ensure conventional commit format
      if (!/^(feat|fix|chore|docs|refactor|test):\s/.test(message)) {
        return fallbackMessage;
      }

      return message || fallbackMessage;
    } catch (err) {
      if (err.status === 429 && retries > 0) {
        console.warn("⚠️ Rate limited. Retrying AI request...");
        await sleep(1000);
        return requestAI(retries - 1);
      }
      console.warn("⚠️ AI commit generation failed:", err.message);
      return fallbackMessage;
    }
  }

  return await requestAI(1); // single retry on 429
}
