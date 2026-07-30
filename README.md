# AICOMM 🤖

[![NPM Version](https://img.shields.io/badge/version-1.1.0-cyan.svg)](https://github.com/yourusername/aicomm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini-orange.svg)](https://deepmind.google/technologies/gemini/)

**AICOMM** is a lighting-fast, AI-powered CLI tool designed to automate your git workflow. It analyzes your changes and generates meaningful, professional, and conventional commit messages in seconds using Google's Gemini AI.

---

## ✨ Features

- 🚀 **Blazing Fast:** Optimized module loading for instant startup.
- 🧠 **AI-Powered:** Uses Google's **Gemini 3.6 Flash** for intelligent code analysis and reasoning.
- 🌍 **Global Configuration:** Set your API key once, and use `aicomm` instantly across all your local repositories. No `.env` files required!
- 📝 **Conventional Commits:** Automatically follows standard commit formats (`feat`, `fix`, `chore`, etc.).
- 🔍 **Lockfile Isolation:** Intelligent filtering ignores noisy lockfiles and minified assets to save tokens.
- 🔄 **Staging Integration:** Quickly stage all changes with the `-s` flag.
- 🧪 **Dry Run:** Preview suggestions without affecting your repository.

---

## 🚀 Quick Start

### 1. Installation

Clone and install dependencies:

```bash
git clone https://github.com/yourusername/aicomm.git
cd aicomm
npm install
npm link
```

### 2. Configuration

You do not need to set up a `.env` file for every project.

Simply run the tool for the first time in any repository. If you haven't configured an API key, aicomm will securely prompt you for it and save it globally to your machine `(~/.aicomm)`.

#If you ever need to update your key manually, run:
```aicomm auth `<your_new_api_key>` ```

### 3. Usage

Simply run `aicomm` inside any git repository:

```bash
aicomm
```

#### Options:
- `auth <key>`: Save or update your Gemini API key globally.
- `-s, --stage-all`: Stage all changes before generating.
- `-p, --push`: Push changes automatically after committing.
- `-d, --dry-run`: Generate message without committing.
- `-v, --verbose`: Show detailed debug logs.
- `-m, --model <name>`: Specify an alternative Gemini model (Default: gemini-3.6-flash).
- `--no-ai`: Skip AI generation and use a fallback chore message.

---

## 🛠 Tech Stack

- **Runtime:** Node.js (>=18.0.0)
- **AI Core:** [@google/genai](https://www.npmjs.com/package/@google/genai)
- **Git Integration:** [simple-git](https://www.npmjs.com/package/simple-git)
- **UI/Terminal:** [commander](https://www.npmjs.com/package/commander), [inquirer](https://www.npmjs.com/package/inquirer), [ora](https://www.npmjs.com/package/ora), [picocolors](https://www.npmjs.com/package/picocolors)

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

