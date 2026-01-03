import fs from "fs";
import path from "path";
import os from "os";

const DEFAULT_CONFIG = Object.freeze({
  provider: "openrouter",
  model: "google/gemini-2.0-flash-exp:free",
  maxDiffLines: 500,
  autoStage: false,
  commitStyle: "conventional", // conventional, simple, detailed
  temperature: 0.2,
});

/**
 * Load configuration from multiple sources (priority order)
 * 1. Project-level .aicommrc
 * 2. User-level ~/.aicommrc
 * 3. Default configuration
 */
export function loadConfig() {
  const configs = [];

  // Try project-level config
  const projectConfigPath = path.resolve(process.cwd(), ".aicommrc");
  if (fs.existsSync(projectConfigPath)) {
    try {
      const config = loadConfigFile(projectConfigPath);
      configs.push(config);
    } catch (err) {
      console.warn(`⚠️  Failed to load project config: ${err.message}`);
    }
  }

  // Try user-level config
  const homeConfigPath = path.resolve(os.homedir(), ".aicommrc");
  if (fs.existsSync(homeConfigPath)) {
    try {
      const config = loadConfigFile(homeConfigPath);
      configs.push(config);
    } catch (err) {
      console.warn(`⚠️  Failed to load user config: ${err.message}`);
    }
  }

  // Merge configs (project config takes precedence)
  return {
    ...DEFAULT_CONFIG,
    ...configs[1], // user config
    ...configs[0], // project config (highest priority)
  };
}

/**
 * Load and validate a config file
 */
function loadConfigFile(configPath) {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const userConfig = JSON.parse(raw);

    if (typeof userConfig !== "object" || Array.isArray(userConfig)) {
      throw new Error("Config must be a JSON object");
    }

    // Validate config values
    if (userConfig.maxDiffLines !== undefined) {
      const maxLines = Number(userConfig.maxDiffLines);
      if (isNaN(maxLines) || maxLines < 10 || maxLines > 10000) {
        throw new Error("maxDiffLines must be between 10 and 10000");
      }
      userConfig.maxDiffLines = maxLines;
    }

    if (userConfig.temperature !== undefined) {
      const temp = Number(userConfig.temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        throw new Error("temperature must be between 0 and 2");
      }
      userConfig.temperature = temp;
    }

    if (userConfig.commitStyle !== undefined) {
      const validStyles = ["conventional", "simple", "detailed"];
      if (!validStyles.includes(userConfig.commitStyle)) {
        throw new Error(`commitStyle must be one of: ${validStyles.join(", ")}`);
      }
    }

    return userConfig;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}`);
    }
    throw err;
  }
}

/**
 * Create a default config file
 */
export function createDefaultConfig(location = "project") {
  const configPath =
    location === "project"
      ? path.resolve(process.cwd(), ".aicommrc")
      : path.resolve(os.homedir(), ".aicommrc");

  if (fs.existsSync(configPath)) {
    throw new Error(`Config file already exists at ${configPath}`);
  }

  const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
  fs.writeFileSync(configPath, configContent, "utf-8");

  return configPath;
}

/**
 * Get available models from OpenRouter
 */
export const RECOMMENDED_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "anthropic/claude-3-haiku",
  "openai/gpt-4o-mini",
];