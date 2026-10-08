import pc from "picocolors";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { getApiKey } from "../utils/config.js";

const DEFAULT_MODEL = 'gemini-3.6-flash';

export const FALLBACK_COMMIT_MESSAGE = "chore: update files";

export async function generateCommitMessage(diff, options = {}, spinner) {
  const { model = DEFAULT_MODEL } = options;

  if (!diff || diff.trim() === "") {
    return FALLBACK_COMMIT_MESSAGE;
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || getApiKey() || "").trim();
  
  if (!apiKey) {
    throw new Error("Missing API Key. Run 'aicomm auth <your_api_key>' to set it globally.");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    if (spinner) {
      spinner.text = pc.cyan(`Gemini (${model}) is analyzing changes...`);
    }

    const systemInstruction = `You are an expert software engineer following best practices for git commits.
Generate a concise, high-quality git commit message following Conventional Commits format based on the diff and summary of changes provided.

RULES:
1. Format: <type>(<optional scope>): <description>
2. Allowed types: feat, fix, chore, docs, style, refactor, perf, test, build, ci.
3. First line (subject) MUST be 72 characters or fewer, written in lowercase imperative mood (e.g., 'feat: add user login', not 'feat: Added user login').
4. If changes are complex or span multiple focus areas, add a blank line after the subject followed by a bulleted body explaining WHAT and WHY (not mechanical HOW).
5. Output ONLY the raw commit message text. No markdown code blocks, no quotes, no conversational prefixes.
6. Keep total length under 800 characters.`;

    const userPrompt = `Analyze the following changes and generate an appropriate Conventional Commit message:\n\n${diff}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
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

    throw new Error(errorMessage);
  }
}