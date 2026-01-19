import pc from "picocolors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const DEFAULT_MODEL = 'gemini-1.5-flash';

// Initialize AI client lazily to ensure env vars are loaded
let genAI;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.geminie_key;
    if (!apiKey) {
      throw new Error("Missing Gemini API Key. Please add GEMINI_API_KEY to your .env file.");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Generate a commit message using Gemini AI
 * @param {string} diff The git diff text
 * @param {object} options CLI options
 * @param {object} spinner Ora spinner instance
 * @returns {Promise<string>} The generated commit message
 */
export async function generateCommitMessage(diff, options = {}, spinner) {
  const { model = DEFAULT_MODEL } = options;

  if (!diff || diff.trim() === "") {
    return "chore: update files";
  }

  try {
    if (spinner) {
      spinner.text = pc.cyan(`Gemini (${model}) is analyzing changes...`);
    }

    const ai = getGenAI();
    const generativeModel = ai.getGenerativeModel({
      model: model,
      generationConfig: {
        temperature: 0.2, // Lower temperature for more predictable git commits
        maxOutputTokens: 800,
      }
    });

    const prompt = `
      You are an expert software engineer following best practices for git commits.
      Write a professional, concise, and clear git commit message based on the following diff.
      
      RULES:
      1. Use the Conventional Commits format (type: description).
      2. Types: feat, fix, chore, docs, style, refactor, perf, test, build, ci.
      3. The first line (subject) should be max 72 characters.
      4. If the changes are complex, add a blank line followed by a bulleted list of focus areas (WHY and WHAT, not HOW).
      5. Do not include any meta-talk like "Sure, here is your message".
      6. Output ONLY the commit message.
      7. Keep the total length under 800 characters.

      DIFF:
      ${diff.slice(0, 10000)}
    `;

    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up markdown code blocks if the AI includes them
    text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();

    // Remove any leading "Commit message:" or similar prefixes
    text = text.replace(/^(Commit message|Message|Subject):\s*/i, '').trim();

    return text || "chore: update files (empty response)";

  } catch (err) {
    if (spinner) {
      spinner.fail(pc.red("AI Generation failed"));
    }

    if (err.message.includes("API_KEY_INVALID")) {
      throw new Error("Invalid Gemini API Key. Please check your .env file.");
    }

    console.error(pc.dim(`Debug info: ${err.message}`));
    return "chore: update files (fallback)";
  }
}