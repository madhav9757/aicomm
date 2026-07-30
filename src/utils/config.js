import fs from "fs";
import path from "path";
import os from "os";

// Store the config in the user's home directory (e.g., C:\Users\Username\.aicomm)
const CONFIG_FILE = path.join(os.homedir(), ".aicomm");

/**
 * Save the API key to the global config file
 * @param {string} key 
 */
export function saveApiKey(key) {
  // We save it as JSON so you can easily add more settings later (like default models)
  const config = { GEMINI_API_KEY: key.trim() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

/**
 * Retrieve the API key from the global config file
 * @returns {string|null}
 */
export function getApiKey() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      const config = JSON.parse(data);
      return config.GEMINI_API_KEY || null;
    }
  } catch (err) {
    // If the file is corrupted or unreadable, fail silently and return null
    return null;
  }
  return null;
}