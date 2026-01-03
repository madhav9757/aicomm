import inquirer from "inquirer";

/**
 * Ask user to confirm/edit commit message
 * @param {string} defaultMessage - AI-generated message
 * @returns {Promise<string>} Final commit message
 */
export async function askCommitMessage(defaultMessage) {
  const { message } = await inquirer.prompt([
    {
      type: "input",
      name: "message",
      message: "Commit message:",
      default: defaultMessage,
      validate(input) {
        const trimmed = input.trim();
        
        if (!trimmed) {
          return "❌ Commit message cannot be empty";
        }
        
        if (trimmed.length > 72) {
          return `⚠️  Message is ${trimmed.length} chars (recommended max: 72)`;
        }
        
        // Check for conventional commit format
        const pattern = /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\(.+?\))?:\s.+/;
        if (!pattern.test(trimmed)) {
          return "⚠️  Consider using conventional commits format: <type>: <description>";
        }
        
        return true;
      },
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Proceed with this commit?",
      default: true,
    },
  ]);

  if (!confirm) {
    console.log("❌ Commit aborted by user.");
    process.exit(0);
  }

  return message.trim();
}

/**
 * Ask user to select files to commit
 * @param {Array} files - List of changed files
 * @returns {Promise<string[]>} Selected files
 */
export async function selectFiles(files) {
  if (!files || files.length === 0) {
    return [];
  }

  const { selectedFiles } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedFiles",
      message: "Select files to commit:",
      choices: files.map(file => ({
        name: `${file.working_dir} ${file.path}`,
        value: file.path,
        checked: true,
      })),
      validate(answer) {
        if (answer.length === 0) {
          return "You must select at least one file";
        }
        return true;
      },
    },
  ]);

  return selectedFiles;
}

/**
 * Confirm action with user
 * @param {string} message - Confirmation message
 * @param {boolean} defaultValue - Default answer
 * @returns {Promise<boolean>}
 */
export async function confirmAction(message, defaultValue = true) {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: defaultValue,
    },
  ]);

  return confirmed;
}