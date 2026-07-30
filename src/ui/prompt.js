import inquirer from "inquirer";
import pc from "picocolors";

/**
 * Ask user what to do with the generated message
 * @param {string} aiMessage - AI-generated message
 * @returns {Promise<string>} Final commit message or 'regenerate' flag
 */
export async function askCommitMessage(aiMessage) {
  console.log(`\n${pc.bold(pc.cyan("🤖 AI Suggested Commit Message:"))}`);
  console.log(pc.dim("─".repeat(50)));
  console.log(pc.bold(pc.white(aiMessage)));
  console.log(pc.dim("─".repeat(50)) + "\n");

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: `✅ ${pc.bold("Use this message")}`, value: "use" },
        { name: `📝 ${pc.bold("Edit message")}`, value: "edit" },
        { name: `🔄 ${pc.bold("Regenerate message")}`, value: "regenerate" },
        { name: `❌ ${pc.bold("Abort commit")}`, value: "abort" },
      ],
    },
  ]);

  if (action === "abort") {
    console.log(pc.yellow("⚠ Commit aborted by user."));
    process.exit(0);
  }

  if (action === "regenerate") {
    return "regenerate";
  }

  if (action === "edit") {
    // Forced "input" type to keep the editing strictly inline in the terminal prompt
    const { editedMessage } = await inquirer.prompt([
      {
        type: "input",
        name: "editedMessage",
        message: "Edit commit message:",
        default: aiMessage,
      },
    ]);

    const trimmed = editedMessage ? editedMessage.trim() : "";

    if (!trimmed) {
      console.log(pc.red("✖ Commit message cannot be empty."));
      process.exit(1);
    }
    return trimmed;
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

  const choices = files.map((file) => {
    let statusBadge = pc.yellow("[M]");
    if (file.index === "?" || file.working_dir === "?")
      statusBadge = pc.green("[A]");
    if (file.index === "D" || file.working_dir === "D")
      statusBadge = pc.red("[D]");

    return {
      name: `${statusBadge} ${file.path}`,
      value: file.path,
      checked: true,
    };
  });

  const { selectedFiles } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedFiles",
      message: "Select files to stage and commit:",
      choices,
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
