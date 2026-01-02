import fs from "fs";
import path from "path";

const DEFAULT_CONFIG = Object.freeze({
  provider: "openrouter",
  model: "google/gemini-2.0-flash-exp:free",
  maxDiffLines: 500,
});

export function loadConfig() {
  const configPath = path.resolve(process.cwd(), ".aicommrc");

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(raw);

    if (typeof userConfig !== "object" || Array.isArray(userConfig)) {
      throw new Error();
    }

    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
    };
  } catch {
    throw new Error(
      "Invalid .aicommrc file. Please check JSON formatting."
    );
  }
}
