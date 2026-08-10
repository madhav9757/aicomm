import fs from "fs";
import path from "path";
import os from "os";

// Store the config in the user's home directory (e.g., ~/.aicomm)
const CONFIG_FILE = path.join(os.homedir(), ".aicomm");

/**
 * Get the global configuration file path
 * @returns {string}
 */
export function getConfigPath() {
  return CONFIG_FILE;
}

/**
 * Read the global configuration file
 * @returns {object}
 */
export function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch {
    return {};
  }
  return {};
}

/**
 * Save the API key to the global config file
 * @param {string} key 
 */
export function saveApiKey(key) {
  const trimmedKey = (key || "").trim();
  const currentConfig = readConfig();
  const updatedConfig = { ...currentConfig, GEMINI_API_KEY: trimmedKey };
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
}

/**
 * Retrieve the API key from the global config file
 * @returns {string|null}
 */
export function getApiKey() {
  const config = readConfig();
  return config.GEMINI_API_KEY || null;
}

/**
 * Retrieve a masked version of the configured API key
 * @returns {string|null}
 */
export function getMaskedApiKey() {
  const key = getApiKey();
  if (!key) return null;
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}