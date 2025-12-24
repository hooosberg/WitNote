<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="WitNote" width="128" height="128">
</p>

<h1 align="center">WitNote (智简笔记本)</h1>

<p align="center">
  <strong>Smart Core, Simple Form</strong><br>
  <i>大智若简，落笔生花</i>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3-green.svg" alt="Apple Silicon">
</p>

> **🎉 Coming Soon to Mac App Store!**
> 
> Fully compliant with Apple's security & privacy standards. Currently under review. Your support and stars ⭐️ keep us going!

**WitNote** is a local-first AI writing companion for macOS and Windows.
Supports free switching between **Ollama / WebLLM / Cloud API** engines, paired with an ultra-minimalist **native card interface**, it works right out of the box. No cloud dependency, no privacy concerns — intelligence made lightweight.

![Local AI](src/pic/witnote%20宣传截图/英文版设计/本地离线ai.jpg)

---

## 🌟 Core Philosophy

- **Smart**: Three Engines in One, Freedom to Choose
  - **WebLLM**: Built-in lightweight model in browser, no installation, works out of the box
  - **Ollama**: Powerful local model, strong performance, completely offline
  - **Cloud API**: Connect to cloud intelligence, infinite possibilities
- **Simple**: No complexity
  - iOS-style card management, drag to organize
  - Smart focus mode — window narrows, editor simplifies
- **Secure**: Data sovereignty
  - [**Privacy Policy**](PRIVACY.md): 100% local storage. Your thoughts belong only to you.

---

## ✨ Features (v1.2.1)

- 📝 **Pure Local Notes** — Choose any folder as your notes vault, supports `.txt` and `.md`
- 🤖 **Three-in-One Engine** — Switch freely between **WebLLM** (Built-in Light), **Ollama** (Local Power), or **Cloud API** (Custom Connection)
- 🎭 **Rich Role Library** — Built-in 10+ selected role prompts (Writer, Translator, Polisher, etc.), one-click switch & custom support
- 🌍 **Global Communication** — **Supports 8 Languages**: 
  - English, 简体中文, 繁體中文, 日本語, 한국어, Français, Deutsch, Español
  - Interface and AI responses automatically adapt to your language
- 🔒 **Privacy First** — All AI inference is local (when using local engines), no data upload, Apple Notarized
- 💬 **Highly Customizable** — Freely edit system prompts to craft your exclusive AI assistant
- 🎨 **Multiple Themes** — Light / Dark / Zen Tea, fully optimized dark mode
- 🗂️ **Card Grid View** — iOS-style with drag-and-drop sorting, polished context menus
- 🔍 **Context Aware** — AI can directly read your current article or folder contents
- 🎯 **Focus Mode** — Auto-switches to distraction-free editing when window narrows

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

> 📝 **Important Notes for Windows Users**:
> 
> As an individual developer without an expensive EV Code Signing Certificate, you might encounter the following:
> 1. **SmartScreen**: If you see "Windows protected your PC" (Unknown Publisher), please click **"More info"** -> **"Run anyway"**.
> 2. **Antivirus Warning**: Windows Defender or other AV software might flag the installer. The project is open-source and safe. If blocked, please try disabling AV temporarily.
> 3. **Run as Admin**: It is recommended to right-click the installer and **"Run as administrator"**.

---

## 🔧 AI Engine Info

### 1. WebLLM (Built-in Light)
The app includes a built-in WebLLM engine and `qwen2.5:0.5b` lightweight model.
- **Pros**: No extra software installation needed, works right after app download.
- **Best for**: Quick Q&A, simple text polishing, low-end devices.

### 2. Ollama (Local Power)
Supports connecting to locally running Ollama service.
- **Pros**: Runs 7B, 14B or even larger models, powerful performance, completely offline.
- **Usage**: Install [Ollama](https://ollama.com) first, then download more models in Settings (e.g., qwen2.5:7b, llama3, etc).

### 3. Cloud API (Limitless Cloud)
Supports connecting to OpenAI-compatible Cloud APIs.
- **Pros**: Access the most powerful models on Earth with just an API Key.
- **Best for**: Top-tier logical reasoning, or when local hardware cannot support large models.
- **Config**: Enter API URL and Key in Settings (Supports DeepSeek, Moonshot, etc).

---

## 📸 Screenshots

### 🎯 Focus Mode
![Focus Mode](src/pic/witnote%20宣传截图/英文版设计/专注模式.jpg)

### 🎨 Multiple Themes
![Themes](src/pic/witnote%20宣传截图/英文版设计/多种主题.jpg)

### 🤖 Local Offline AI
![Local AI](src/pic/witnote%20宣传截图/英文版设计/本地离线ai.jpg)

### 💾 Offline Storage
![Storage](src/pic/witnote%20宣传截图/英文版设计/离线存储.jpg)

### 🔄 Format Conversion
![Format](src/pic/witnote%20宣传截图/英文版设计/格式转换.jpg)

### 📥 Model Download
![Models](src/pic/witnote%20宣传截图/英文版设计/模型下载.jpg)

### 👤 Character Customization
![Persona](src/pic/witnote%20宣传截图/英文版设计/角色定制.jpg)

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
