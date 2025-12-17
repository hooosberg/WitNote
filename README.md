<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="WitNote" width="128" height="128">
</p>

# WitNote (智简笔记本)

> **Smart Core, Simple Form**
> *大智若简，落笔生花*

[English](README.md) | [中文](README_zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)]()
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3%20|%20M4-green.svg)]()

**WitNote** is a local-first AI writing companion for macOS.
We pack a powerful **dual AI engine** into an ultra-minimalist **native card interface**. No cloud dependency, no privacy concerns — intelligence made lightweight.

![Local AI](src/pic/本地ai.png)

---

## 🌟 Core Philosophy

- **Smart**: Dual-engine AI
  - **Primary**: Auto-connects to local Ollama for full power
  - **Portable**: Built-in WebLLM browser model, ready out of the box
- **Simple**: No complexity
  - iOS-style card management, drag to organize
  - Smart focus mode — window narrows, editor simplifies
- **Secure**: Data sovereignty
  - 100% local storage. Your thoughts belong only to you.

---

## ✨ Features

- 📝 **Pure Local Notes** — Choose any folder as your notes vault, supports `.txt` and `.md`
- 🤖 **Dual AI Engine** — WebLLM (lightweight built-in) + Ollama (powerful external)
- 🎨 **Multiple Themes** — Light / Dark / Zen Tea
- 🗂️ **Card Grid View** — iOS-style with drag-and-drop sorting
- 🔍 **Context Aware** — AI can directly read your current article
- 🎯 **Focus Mode** — Auto-switches when window narrows
- 🌍 **Internationalization** — English and Chinese support

---

## 🚀 Quick Start

### Installation

Download the latest DMG installer from [Releases](https://github.com/hooosberg/WitNote/releases).

**Recommended Platform**: Apple Silicon (M1 / M2 / M3 / M4) Mac devices

### Development

```bash
# Clone the repository
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# Install dependencies
npm install

# Start development server
npm run dev

# Build production version
npm run build
```

---

## 🔧 AI Engine Configuration

### WebLLM (Built-in)
Ready to use out of the box. The lightweight model downloads automatically on first use.

### Ollama (Recommended)
For more powerful AI capabilities, install [Ollama](https://ollama.com):

```bash
# After installing Ollama, download recommended models
ollama pull qwen2.5:0.5b
# Or a larger model
ollama pull qwen2.5:3b
```

The app automatically detects local Ollama service and prioritizes it.

---

## 📸 Screenshots

![Multilingual Support](src/pic/多语言.png)
![Dark Mode](src/pic/深色模式.png)
![Smart Engine Switching](src/pic/智能引擎切换.png)

---

## 📄 License

MIT License

---

## 👨‍💻 Developer

**hooosberg**

📧 [zikedece@proton.me](mailto:zikedece@proton.me)

🔗 [https://github.com/hooosberg/WitNote](https://github.com/hooosberg/WitNote)

---

<p align="center">
  <i>Smart Core, Simple Form</i>
</p>
