import pc from "picocolors";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { getApiKey } from "../utils/config.js";

const DEFAULT_MODEL = 'gemini-3.6-flash';

// DO NOT put the API key check up here! It will crash on import.

/**
 * Generate a commit message using Gemini AI
 */
export async function generateCommitMessage(diff, options = {}, spinner) {
  const { model = DEFAULT_MODEL } = options;

  if (!diff || diff.trim() === "") {
    return "chore: update files";
  }

  // 1. LAZY INITIALIZATION: Check for the key inside the function
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || getApiKey() || "").trim();
  
  if (!apiKey) {
    throw new Error("Missing API Key. Run 'aicomm auth <your_api_key>' to set it globally.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (spinner) {
      spinner.text = pc.cyan(`Gemini (${model}) is analyzing changes...`);
    }

    const prompt = `
      You are an expert software engineer following best practices for git commits.
      Write a professional, concise, and clear git commit message based on the following diff.
      
      RULES:
      1. Use the Conventional Commits format (type: description).
      2. Types: feat, fix, chore, docs, style, refactor, perf, test, build, ci.
      3. The first line (subject) should be max 72 characters.
      4. If the changes are complex, add a blank line followed by a bulleted list of focus areas (WHY and WHAT, not HOW).
      5. Do not include any meta-talk like "Sure, here is your message" or markdown wrappers.
      6. Output ONLY the raw commit message text.
      7. Keep the total length under 800 characters.

      DIFF:
      ${diff.slice(0, 10000)}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    let text = response.text ? response.text.trim() : "";

    text = text.replace(/^```[a-z]*\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    text = text.replace(/^(Here is|Commit message|Message|Subject):\s*/i, '').trim();

    return text || "chore: update files (empty response)";

  } catch (err) {
    if (spinner) {
      spinner.fail(pc.red("AI Generation failed"));
    }

    let errorMessage = err.message || "Unknown error";
    try {
      const parsed = JSON.parse(errorMessage);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // not JSON, use raw message
    }

    if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
      throw new Error(
        `Invalid Gemini API Key.\nUpdate it by running: ${pc.cyan("aicomm auth <your_api_key>")}`
      );
    }

    if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
      throw new Error(
        `Gemini API quota exceeded.\nPlease wait a moment or check your account limits at https://aistudio.google.com/`
      );
    }

    console.error(pc.red(`\nError: ${errorMessage}`));
    if (err.stack && options.verbose) console.error(pc.dim(err.stack));

    return "chore: update files (fallback)";
  }
}