import inquirer from "inquirer";

export async function askCommitMessage(defaultMessage) {
  const { message } = await inquirer.prompt([
    {
      type: "input",
      name: "message",
      message: "Proposed commit message:",
      default: defaultMessage,
      validate(input) {
        if (!input.trim()) {
          return "Commit message cannot be empty";
        }
        if (input.length > 72) {
          return "Commit message should be under 72 characters";
        }
        return true;
      },
    },
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Proceed with this commit message?",
      default: true,
    },
  ]);

  if (!confirm) {
    console.log("❌ Commit aborted by user.");
    process.exit(0);
  }

  return message.trim();
}
