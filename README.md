<p align="center">
  <img src="src/icon/app-icon.png" alt="WitNote" width="120" height="120">
</p>

<h1 align="center">WitNote</h1>

<p align="center">
  <strong>Smart Core, Simple Form</strong>
  <br>
  <em>A clean, lightweight, and local-first Markdown companion.</em>
  <br><br>
  <a href="README.md"><strong>English</strong></a> | <a href="i18n/README_zh.md"><strong>简体中文</strong></a> | <a href="https://hooosberg.com/apps/witnote/">🌐 <strong>Official Website</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/version-2.0.1-brightgreen.svg" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows%20|%20Linux%20|%20macOS-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/arch-x86__64%20|%20ARM64-orange.svg" alt="Architecture">
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
    <img src="src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="46">
  </a>
</p>

---

<!-- Sponsor Section Start -->
<p align="center">
  <a href="https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link" target="_blank">
    <img src="docs/assets/infistar-banner.png" alt="Infistar.cc - 一站式全球大模型API服务平台" width="100%">
  </a>
</p>

> [!TIP]
> **💖 Sponsored by [Infistar.cc](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) (无限星河)**
> 
> **English**: Special thanks to [Infistar.cc](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) for sponsoring WitNote! Access Claude, GPT, Gemini, and DeepSeek via a single API key with multi-node redundancy against 429 limits. Rates start at up to 99% off (0.01x) official pricing, effortlessly powering heavy RAG search, long-document summarization, and PKM workflows without token anxiety.  
> WitNote users can sign up through the [Referral Link](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) to claim a **$5 test credit** and exclusive first-recharge discounts—get started instantly!
> 
> **中文**：感谢 [Infistar.cc 无限星河](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) 赞助本项目！平台聚合 Claude、GPT、Gemini、DeepSeek 等主流模型，单 Key 自由切换，多节点冗余抗 429。价格低至官方 0.1 折起，倍率透明，轻松支撑海量笔记 RAG 检索、长文精读与知识库整理，长时使用无 Token 焦虑。  
> WitNote 用户通过 [专属推广链接](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) 注册，即领 **$5 测试额度** 与首充专享特惠，即刻开箱体验！
<!-- Sponsor Section End -->

---

## 🍃 Returning to Simplicity: Our Philosophy

In an era where writing software and AI tools are becoming increasingly complex, heavy, and bloated with endless configurations, **WitNote stays true to its original purpose**:

> **Fast, distraction-free, and elegant Markdown dual-pane editing.**

We focus on doing the core essentials to perfection:
- ⚡ **Instant Open**: Open any local `.md` / `.txt` file or vault instantly without waiting.
- 🌓 **Pure Dual-Pane**: Write on the left, live-render on the right (with full GFM & LaTeX math support).
- 📴 **Offline First**: All files remain 100% on your local disk.
- 🤖 **Lightweight AI Companion**: AI is not a complicated, intrusive agent here—it functions simply as an offline encyclopedia, translator, and writing assistant.

---

## 🍎 Apple Ecosystem (Native Swift Architecture)

For macOS, iOS, and iPadOS, WitNote has transitioned to a **100% pure native architecture written in Swift & SwiftUI**.

- **Why Native?** Native Apple architecture deeply integrates with Apple Silicon hardware and macOS system energy-efficiency frameworks, offering instantaneous startup, buttery-smooth scrolling, and zero runtime container overhead.
- **Mac App Store**: Directly search **"WitNote"** on the App Store or [Click Here to Download](https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12) to enjoy official sandbox protection and silent updates.
- **iOS & iPadOS**: Native mobile versions are currently under active development.
- *(Note: Mac users who prefer the open-source Electron build can still compile and run it from source code.)*

---

## 📦 Open Source Releases (Windows & Linux)

The open-source edition will **continue active, long-term development**, dedicated to providing the cleanest cross-platform Markdown workspace for Windows and Linux users.

From **v2.0.1** onward, official binary packages natively support both **x86_64** and **ARM64** architectures:

| Platform | Architecture | Package Format | Download |
| :--- | :--- | :--- | :--- |
| 🪟 **Windows** | x86_64 (Intel/AMD) | Setup Installer (`.exe`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 🪟 **Windows** | ARM64 (Snapdragon/Surface) | Setup Installer (`.exe`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 🐧 **Linux** | x86_64 / ARM64 | Universal AppImage (`.AppImage`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 📦 **Linux (Debian/Ubuntu)** | x86_64 / ARM64 | Debian Package (`.deb`) | [Releases](https://github.com/hooosberg/WitNote/releases) |

---

## ✨ Key Features (v2.0.1)

- 📝 **Pure Markdown & File Vault** — Open any folder directly as a workspace. No databases, no proprietary lock-in. Everything is a file.
- 🧮 **Flawless LaTeX & Code Blocks** — Robust math rendering for multi-line formulas, alignments, matrices, and code highlighting.
- 🛡️ **Hardened Security** — Built-in DOMPurify sanitization; links open safely in your default browser.
- 🤖 **Clean AI Integration** — Connect effortlessly with **Ollama** (local powerful models) or **Cloud API** (DeepSeek, OpenAI, etc.) with quick one-click context clearing.
- 🎨 **Minimalist Card UI** — Clean frosted glass aesthetic, custom themes (Light / Dark / Tea), and focus mode.

---

## 🛠️ Build from Source

```bash
# Clone repository
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# Install dependencies
npm install

# Start development mode
npm run dev

# Package for Windows
npm run build:win

# Package for Linux
npm run build:linux
```

---

## 📄 License & Privacy

- **License**: MIT License. Open source and free.
- **Privacy**: 100% local storage. We never collect or upload your notes or private keys.
