import inquirer from "inquirer";
import pc from "picocolors";

/**
 * Ask user what to do with the generated message
 * @param {string} aiMessage - AI-generated message
 * @returns {Promise<string>} Final commit message
 */
export async function askCommitMessage(aiMessage) {
  console.log(`\n${pc.bold(pc.magenta("AI Suggestion:"))}\n${pc.italic(pc.white(aiMessage))}\n`);

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: `✅ ${pc.bold("Use this message")}`, value: "use" },
        { name: `📝 ${pc.bold("Edit message")}`, value: "edit" },
        { name: `❌ ${pc.bold("Abort commit")}`, value: "abort" },
      ],
    },
  ]);

  if (action === "abort") {
    console.log(pc.yellow("⚠ Commit aborted by user."));
    process.exit(0);
  }

  if (action === "edit") {
    const { editedMessage } = await inquirer.prompt([
      {
        type: "input", // Or editor if it's very long, but input is faster
        name: "editedMessage",
        message: "Edit commit message:",
        default: aiMessage,
      },
    ]);

    if (!editedMessage.trim()) {
      console.log(pc.red("✖ Commit message cannot be empty."));
      process.exit(1);
    }
    return editedMessage.trim();
  }

  return aiMessage;
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
      choices: files.map((file) => ({
        name: `${pc.dim(file.working_dir)} ${file.path}`,
        value: file.path,
        checked: true,
      })),
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
      message: pc.cyan(message),
      default: defaultValue,
    },
  ]);

  return confirmed;
}


