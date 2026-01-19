# AICOMM 🤖

[![NPM Version](https://img.shields.io/badge/version-1.1.0-cyan.svg)](https://github.com/yourusername/aicomm)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini-orange.svg)](https://deepmind.google/technologies/gemini/)

**AICOMM** is a lighting-fast, AI-powered CLI tool designed to automate your git workflow. It analyzes your changes and generates meaningful, professional, and conventional commit messages in seconds using Google's Gemini AI.

---

## ✨ Features

- 🚀 **Blazing Fast:** Optimized with dynamic module loading for instant startup.
- 🧠 **AI-Powered:** Uses Google's **Gemini 2.0 Flash** for intelligent code analysis.
- 📝 **Conventional Commits:** Automatically follows standard commit formats (`feat`, `fix`, `chore`, etc.).
- 🔍 **Lockfile Isolation:** Intelligent filtering to ignore noisy lockfile changes.
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

Create a `.env` file in the root directory and add your Gemini API Key:

```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Usage

Simply run `aicomm` inside any git repository:

```bash
aicomm
```

#### Options:

- `-s, --stage-all`: Stage all changes before generating.
- `-p, --push`: Push changes automatically after committing.
- `-d, --dry-run`: Generate message without committing.
- `-v, --verbose`: Show detailed debug logs.
- `-m, --model`: Specify an alternative Gemini model.

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

---

<p align="center">Made with ❤️ for developers who hate writing commit messages.</p>
