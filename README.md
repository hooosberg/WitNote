<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="WitNote" width="128" height="128">
</p>

<h1 align="center">WitNote</h1>

<p align="center">
  <strong>Smart Core, Simple Form</strong>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3%20|%20M4%20|%20M5-green.svg" alt="Apple Silicon">
  <br>
  <img src="https://img.shields.io/badge/Editable-md%20%7C%20txt-007AFF.svg" alt="Editable">
  <img src="https://img.shields.io/badge/Preview-pdf%20%7C%20docx%20%7C%20images-FF9500.svg" alt="Preview">
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
    <img src="src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="50">
  </a>
</p>

> **🎉 Now Available on Mac App Store!**
> 
> WitNote has officially landed on the Mac App Store. Thank you for your support! Your Star ⭐️ is our biggest motivation to keep moving forward!

**WitNote** is a local-first AI writing companion for macOS, Windows, and Linux.
Supports free switching between **Ollama / WebLLM / Cloud API** engines, paired with an ultra-minimalist **native card interface**, it works right out of the box. No continuous cloud dependency, no privacy concerns — intelligence made lightweight.

![Local Offline AI Note](src/pic/witnote%20宣传截图/English/本地离线AI记事本.jpg)



---

## 🌟 Core Philosophy

- **Smart**: Three Engines in One, Freedom to Choose
  - **WebLLM**: Lightweight model, requires download on first run, then works offline
  - **Ollama**: Powerful local model, strong performance, completely offline
  - **Cloud API**: Connect to cloud intelligence, infinite possibilities
- **Simple**: No complexity
  - iOS-style card management, drag to organize
  - Smart focus mode — window narrows, editor simplifies
- **Secure**: Data sovereignty
  - [**Privacy Policy**](PRIVACY.md): 100% local storage. Your thoughts belong only to you.

---

## ✨ Features (v1.3.3)

### 🆕 What's New in v1.3.3

- 🪟 **Frosted Glass UI** — Brand new visual design, modern frosted glass effect throughout
- 📐 **Flexible Three-Pane Layout** — Sidebar, Editor, and AI Panel can be resized and closed independently
- ✋ **Dual-Pane Drag & Edit** — In split view, drag the divider freely to adjust editor/preview ratio
- 📂 **Finder-Style File Tree** — Color tags, drag-to-move, hover-to-expand, fully upgraded context menu
- 📄 **Multi-Format Support** — Added PDF/Word preview, supports common image formats
  - Editable: `.md` `.txt`
  - Read-only Preview: `.pdf` `.docx`
  - Image Viewer: `.jpg` `.png` `.gif` `.webp`
- 🚀 **Faster Startup** — Optimized splash screen, significantly reduced white screen wait time
- 🔒 **App Store Release** — Fully compliant with Apple Sandbox security standards, now on Mac App Store

### 🔧 Core Features

- 📝 **Pure Local Notes** — Choose any folder as your notes vault, supports `.txt` and `.md`
- 🤖 **Three-in-One Engine** — Switch freely between **WebLLM** (Light), **Ollama** (Local Power), or **Cloud API** (Custom Connection)
- ✨ **Smart Autocomplete** — 3 presets (Lite/Standard/Full), Press Tab to accept suggestions sentence by sentence
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

## 🚀 Quick Start

### Download

#### 🍎 Mac App Store (Recommended)

<a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
  <img src="src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="50">
</a>

#### 📦 GitHub Releases

Download the latest installer from [Releases](https://github.com/hooosberg/WitNote/releases):

| Platform | File | Note |
|----------|------|------|
| 🍎 macOS | `WitNote-1.3.3.dmg` | Apple Silicon (M1/M2/M3/M4/M5) Only |
| 🪟 Windows (x64) | `WitNote-1.3.3-setup-x64.exe` | Standard PC (Intel/AMD) |
| 🪟 Windows (ARM64) | `WitNote-1.3.3-setup-arm64.exe` | Snapdragon PCs (e.g. Surface Pro X) |
| 🐧 Linux (AppImage) | `WitNote-1.3.3-x86_64.AppImage` | x64 Universal (ARM64 available) |
| 📦 Linux (Deb) | `WitNote-1.3.3-amd64.deb` | Ubuntu/Debian x64 (ARM64 available) |

---

## 💻 System Requirements

### 🍎 macOS

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS Version | macOS 12.0+ | macOS 13.0+ |
| Chip | **Not Supported (Intel Chips)** | **Apple Silicon (M1/M2/M3/M4/M5)** |
| RAM | - | 16GB+ |
| Storage | - | SSD, 4GB+ free space |

> ❌ **Important Note for Intel Macs**: 
> 
> This application **does not support** Mac computers with Intel chips. Even if forced to run, the experience will be extremely poor due to the following reasons:
> 1. **Architectural Incompatibility**: The built-in local inference engines (WebLLM/Ollama) deeply rely on the ARM64 architecture and NPU/Metal hardware acceleration of Apple Silicon.
> 2. **Lack of Hardware Acceleration**: Intel Macs lack Unified Memory Architecture. Running quantized models is extremely slow (generating a single token may take seconds) and causes severe device heating.
> 3. **Architectural Trade-off**: To ensure the best experience and minimal package size, we have removed support for the x86_64 architecture.
> 
> We strongly recommend using Mac devices equipped with Apple Silicon (M-series) chips.

### 🪟 Windows

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS Version | Windows 10 (64-bit) | Windows 11 |
| Processor | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| RAM | 8GB | 16GB+ |
| Storage | 2GB free space | SSD, 4GB+ free space |
| GPU | Integrated graphics | Discrete GPU with Vulkan support |

> ⚠️ **Note**: Windows ARM64 devices (e.g. Surface Pro X) are now natively supported!

### 🐧 Linux

| Item | Minimum | Recommended |
|------|---------|-------------|
| OS Version | Ubuntu 20.04+ / Debian 11+ | Latest Mainstream Distro |
| Arch | x64 / ARM64 | x64 / ARM64 |
| RAM | 8GB | 16GB+ |

---

## 📦 Installation

### 🍎 macOS Installation

**Method 1: Mac App Store (Recommended)**

Search for "WitNote" in the App Store or [Click Here](https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12) to download and install, enjoying automatic updates.

**Method 2: DMG Installer**

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

### 🐧 Linux Installation

**AppImage (Universal):**
1. Download `.AppImage` file
2. Right-click Properties -> Allow executing file as program (or `chmod +x WitNote*.AppImage`)
3. Double-click to run

**Deb (Ubuntu/Debian):**
1. Download `.deb` file (e.g., `WitNote-1.3.3-amd64.deb`)
2. Run installation via terminal (automatically handles dependencies):
   ```bash
   sudo apt install ./WitNote-1.3.3-amd64.deb
   ```

> 📝 **Important Notes for Windows Users**:
> 
> As an individual developer without an expensive EV Code Signing Certificate, you might encounter the following:
> 1. **SmartScreen**: If you see "Windows protected your PC" (Unknown Publisher), please click **"More info"** -> **"Run anyway"**.
> 2. **Antivirus Warning**: Windows Defender or other AV software might flag the installer. The project is open-source and safe. If blocked, please try disabling AV temporarily.

---

## 🔧 AI Engine Info

### 1. WebLLM (Light)
The app includes a built-in WebLLM engine with `qwen2.5:0.5b` model (macOS only, Windows users are recommended to use Ollama).
- **Pros**: No extra software installation needed, works completely offline after initial model download.
- **Best for**: Quick Q&A, simple text polishing, low-end devices.

### 2. Ollama (Local Power)
Supports connecting to locally running Ollama service.
- **Pros**: Runs 7B, 14B or even larger models, powerful performance, completely offline.
- **Usage**: Install [Ollama](https://ollama.com) first, then download more models in Settings (e.g., qwen2.5:7b, llama3, etc).

### 3. Cloud API (Limitless Cloud)
Supports connecting to OpenAI-compatible Cloud APIs.
- **Pros**: Access the most powerful models on Earth with just an API Key.
- **Best for**: Top-tier logical reasoning, or when local hardware cannot support large models.
- **Config**: Enter API URL and Key in Settings (Supports OpenAI, Gemini, DeepSeek, Moonshot, etc).

---

## 📸 Screenshots


### 📐 Dual-Pane Editor
![Dual-Pane Editor](src/pic/witnote%20宣传截图/English/双栏预览编辑.jpg)

### 🤖 Three AI Engines
![Three AI Engines](src/pic/witnote%20宣传截图/English/三种AI引擎.jpg)

### ✨ Smart Autocomplete
![Smart Autocomplete](src/pic/witnote%20宣传截图/English/智能续写.jpg)

### 🎭 Personalized Persona
![Personalized Persona](src/pic/witnote%20宣传截图/English/个性化角色.jpg)

### 📄 Multi-Format Support
![Multi-Format Support](src/pic/witnote%20宣传截图/English/word%20pdf%20jpg%20多种格式支持.jpg)

### 🎯 Focus Mode
![Focus Mode](src/pic/witnote%20宣传截图/English/专注模式.jpg)

### 🎨 Multiple Themes
![Multiple Themes](src/pic/witnote%20宣传截图/English/多种主题外观.jpg)

### 🗂️ Card File Management
![Card File Management](src/pic/witnote%20宣传截图/English/卡片管理文件.jpg)


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

📖 [Development Diary](public/dev-diaries/dev-diary_en.md)

---

<p align="center">
  <i>Smart Core, Simple Form</i>
</p>
