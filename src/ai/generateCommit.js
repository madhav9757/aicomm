import ollama from 'ollama';
import pc from "picocolors";

const DEFAULT_MODEL = 'llama3.2'; 

export async function generateCommitMessage(diff, options = {}, spinner) {
  const { disableAI = false, model = DEFAULT_MODEL } = options;
  
  if (disableAI || !diff) return "chore: update files";

  try {
    // 1. Check if the model exists (Same as before)
    if (spinner) spinner.text = pc.blue(`Checking for model ${model}...`);
    const localModels = await ollama.list();
    const hasModel = localModels.models.some(m => m.name.includes(model));

    if (!hasModel) {
      if (spinner) spinner.text = pc.yellow(`Downloading ${model} (one-time setup)...`);
      await ollama.pull({ model });
    }

    if (spinner) spinner.text = pc.cyan(`AI is writing a detailed report...`);

    // 2. Generate the message (Updated for Long Format)
    const response = await ollama.chat({
      model: model,
      messages: [
        { 
          role: "system", 
          content: `Write a detailed and professional git commit message based on the diff provided.
          Follow this EXACT structure:
          1. A single summary line (max 72 chars) starting with a conventional commit type (feat:, fix:, chore:, etc.).
          2. A blank line.
          3. A detailed bulleted list explaining exactly WHAT changed and WHY.
          
          Do not include any intro text like 'Here is the message'. Just the git message itself. and the total chars should be under 600 characters(imp)` 
        },
        { 
          role: "user", 
          content: `Diff summary:\n${diff.slice(0, 3000)}` // Increased slice for more context
        }
      ],
      options: {
        temperature: 0.4, // Slightly higher for better descriptive flow
        num_predict: 500,  // Increased from 40 to 500 characters to allow for body text
        num_ctx: 4096      // Standard context window
      }
    });

    const finalMessage = response.message.content.trim();
    
    // Safety check to remove any markdown code block artifacts the AI might add
    return finalMessage.replace(/```/g, '') || "feat: update project";

  } catch (err) {
    if (spinner) spinner.fail(pc.red("AI Error: Ensure Ollama is running."));
    console.error(err);
    return "chore: update files (fallback)";
  }
}