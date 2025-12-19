<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="WitNote" width="128" height="128">
</p>

# WitNote (智简笔记本)

> **Smart Core, Simple Form**
> *大智若简，落笔生花*

[English](README.md) | [中文](README_zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20|%20Windows-lightgrey.svg)]()
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3%20|%20M4-green.svg)]()

**WitNote** is a local-first AI writing companion for macOS and Windows.
With a built-in **Ollama AI engine** and an ultra-minimalist **native card interface**, it works right out of the box. No cloud dependency, no privacy concerns — intelligence made lightweight.

![Local AI](src/pic/本地ai.png)

---

## 🌟 Core Philosophy

- **Smart**: Local AI, ready out of the box
  - Built-in Ollama engine, auto-starts, ready to use
  - Pre-installed lightweight model, no extra configuration needed
- **Simple**: No complexity
  - iOS-style card management, drag to organize
  - Smart focus mode — window narrows, editor simplifies
- **Secure**: Data sovereignty
  - 100% local storage. Your thoughts belong only to you.

---

## ✨ Features

- 📝 **Pure Local Notes** — Choose any folder as your notes vault, supports `.txt` and `.md`
- 🤖 **Local AI Engine** — Built-in Ollama, ready out of the box, supports 10+ downloadable models
- 💬 **Customizable AI Persona** — Editable system prompt with one-click restore to default
- 🌏 **Smart Multilingual Response** — AI responds in Chinese for Chinese UI, English for English UI
- 🎨 **Multiple Themes** — Light / Dark / Zen Tea, fully optimized dark mode
- 🗂️ **Card Grid View** — iOS-style with drag-and-drop sorting, polished context menus
- 🔍 **Context Aware** — AI can directly read your current article or folder contents
- 🎯 **Focus Mode** — Auto-switches to distraction-free editing when window narrows
- 🌍 **Internationalization** — Full English and Chinese support, UI and AI in sync

---

## 🚀 Quick Start

### Download

Get the latest installer from [Releases](https://github.com/hooosberg/WitNote/releases):

| Platform | File | Notes |
|----------|------|-------|
| 🍎 macOS | `WitNote-x.x.x.dmg` | Apple Silicon optimized |
| 🪟 Windows | `WitNote-x.x.x-setup.exe` | 64-bit Windows 10/11 |

---

## 💻 System Requirements

### 🍎 macOS

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS Version | macOS 10.15+ | macOS 12.0+ |
| Chip | Intel Core i5 | Apple Silicon (M1/M2/M3/M4) |
| RAM | 8GB | 16GB+ |
| Storage | 2GB free space | SSD, 4GB+ free space |

> 💡 **Tip**: Apple Silicon devices offer significantly better performance for local AI models!

### 🪟 Windows

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS Version | Windows 10 (64-bit) | Windows 11 |
| Processor | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| RAM | 8GB | 16GB+ |
| Storage | 2GB free space | SSD, 4GB+ free space |
| GPU | Integrated graphics | Discrete GPU with Vulkan support |

> ⚠️ **Note**: Windows version is newly released. Feedback welcome!

---

## 📦 Installation

### 🍎 macOS Installation

1. Download the `.dmg` file
2. Double-click to open the DMG
3. Drag the app to Applications folder
4. Launch from Applications

> 🎉 **Great News!**
>
> This app is now **Apple Notarized**! No more "unverified developer" warnings!
>
> 😅 *~~The developer bravely took out a loan to afford the $99 Apple Developer account...~~*
> *(Yes, this actually happened. Thanks to all users for your support!)*

### 🪟 Windows Installation

1. Download the `.exe` installer
2. Run the setup wizard
3. Choose installation path (customizable)
4. Complete installation, launch from Desktop or Start Menu

> 📝 **Notes**:
> - Windows version is brand new — please [report issues](https://github.com/hooosberg/WitNote/issues) if you encounter any problems
> - First launch may require trust from Windows Defender or antivirus software
> - Built-in AI model needs some time to load on first use

---

## 🔧 AI Engine Info

### Ready Out of the Box
The app includes a built-in Ollama engine and the `qwen2.5:0.5b` lightweight model. Works right from the first launch, no configuration needed.

### Expand with More Models
For more powerful AI capabilities, download additional models from Settings:

| Model | Size | Use Case |
|-------|------|----------|
| qwen2.5:0.5b | ~400MB | Quick Q&A (built-in) |
| qwen2.5:1.5b | ~1GB | Daily writing assistance |
| qwen2.5:3b | ~2GB | Deep writing, long-form content |

---

## 📸 Screenshots

![Multilingual Support](src/pic/多语言.png)
![Dark Mode](src/pic/深色模式.png)
![Smart Engine Switching](src/pic/智能引擎切换.png)

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# Install dependencies
npm install

# Start development server
npm run dev

# Build macOS version
npm run build

# Build Windows version
npm run build -- --win
```

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
