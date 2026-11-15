<p align="center">
  <img src="../src/icon/app-icon.png" alt="智简笔记本" width="120" height="120">
</p>

<h1 align="center">智简笔记本 (WitNote)</h1>

<p align="center">
  <strong>大智若简，落笔生花</strong>
  <br>
  <em>纯粹、干净、本地优先的极简 Markdown 知识库与写作伴侣。</em>
  <br><br>
  <a href="../README.md"><strong>English</strong></a> | <a href="README_zh.md"><strong>简体中文</strong></a> | <a href="https://hooosberg.com/apps/witnote/">🌐 <strong>官方网站</strong></a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/version-2.0.1-brightgreen.svg" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows%20|%20Linux%20|%20macOS-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/arch-x86__64%20|%20ARM64-orange.svg" alt="Architecture">
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12">
    <img src="../src/icon/Download_on_the_App_Store_Badge.svg" alt="Download on the Mac App Store" height="46">
  </a>
</p>

---

<!-- Sponsor Section Start -->
<p align="center">
  <a href="https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link" target="_blank">
    <img src="../docs/assets/infistar-banner.png" alt="Infistar.cc - 一站式全球大模型API服务平台" width="100%">
  </a>
</p>

> [!TIP]
> **💖 赞助商支持 / Sponsored by [Infistar.cc 无限星河](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link)**
> 
> **中文**：感谢 [Infistar.cc 无限星河](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) 赞助本项目！平台聚合 Claude、GPT、Gemini、DeepSeek 等主流模型，单 Key 自由切换，多节点冗余抗 429。价格低至官方 0.1 折起，倍率透明，轻松支撑海量笔记 RAG 检索、长文精读与知识库整理，长时使用无 Token 焦虑。  
> WitNote 用户通过 [专属推广链接](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) 注册，即领 **$5 测试额度** 与首充专享特惠，即刻开箱体验！
> 
> **English**: Special thanks to [Infistar.cc](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) for sponsoring WitNote! Access Claude, GPT, Gemini, and DeepSeek via a single API key with multi-node redundancy against 429 limits. Rates start at up to 99% off (0.01x) official pricing, effortlessly powering heavy RAG search, long-document summarization, and PKM workflows without token anxiety.  
> WitNote users can sign up through the [Referral Link](https://www.infistar.cc/register?aff=MCLBTDB2&ref_source=link) to claim a **$5 test credit** and exclusive first-recharge discounts—get started instantly!
<!-- Sponsor Section End -->

---

## 🍃 回归纯粹：我们的产品初心

在如今写作软件与各类 AI 工具功能越来越臃肿、层层配置越来越繁杂的当下，**智简笔记本 (WitNote) 选择坚守最初的设计初心**：

> **快速、无打扰、优雅地打开本地 Markdown 文件进行双栏编辑与阅读，把这一件事做到极致。**

我们拒绝做复杂的重型 Agent，专注做好最核心的体验：
- ⚡ **极速秒开**：打开任何本地 `.md` / `.txt` 文件或整个工作区目录，毫秒级响应，无需等待。
- 🌓 **纯粹双栏**：左侧专注敲击文字，右侧实时双向渲染（完美支持 GitHub Flavored Markdown 与多行 LaTeX 数学公式）。
- 📴 **100% 数据自治**：所有文件直接落在本地文件系统，没有数据库绑定，没有格式绑架。
- 🤖 **轻量 AI 伴侣**：AI 在这里不是喧宾夺主的庞大系统，而是在断网或弱网环境下随时可查的「离线维基百科」、轻量翻译与写作润色辅助。

---

## 🍎 苹果生态路线说明（Swift 纯原生架构）

为了追求极致丝滑的能效与视觉交互，WitNote 在苹果生态（macOS / iOS / iPadOS）全面采用了 **Swift & SwiftUI 纯原生重写架构**（v2.0+），目前三端均已**正式上架 Apple App Store**。

- **为什么选原生？** 纯原生架构深度调用了 Apple Silicon 芯片硬件加速与系统级能效框架，相比跨平台容器拥有极速冷启动、原生文本渲染质感与极低内存开销。
- **Mac App Store 下载**：在 Mac App Store 搜索 **"WitNote"** 或 [点击此处前往商店下载](https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12)，享受官方沙盒安全保障与静默更新。
- **iOS & iPadOS App Store**：iPhone 与 iPad 原生版本已同步上架（正在持续优化移动端 AI 栏交互响应体验）。

### 版本选择对照表

| 版本 | 技术栈与分发渠道 | 适用人群 | 核心优势 |
| :--- | :--- | :--- | :--- |
| **Apple App Store 纯原生版** | Swift & SwiftUI（macOS / iOS / iPadOS） | 苹果生态日常用户 | App Store 一键安装免配置、官方沙盒安全、Apple Silicon 原生省电高帧率体验 |
| **GitHub 开源跨平台版** | Electron / Vite（Windows / Linux / macOS 源码） | Windows / Linux 用户与开发者 | MIT 开源透明、官方 x86_64 & ARM64 安装包、支持自行克隆二次编译 |

---

## 📦 开源版本发布 (Windows & Linux)

开源版本将**长期保持积极、持续的维护与开发**，致力于为广大 Windows 与 Linux 开发者和写作者提供最干净好用的本地 Markdown 工作区。

自 **v2.0.1** 版本起，官方 Releases 安装包全面原生支持 **x86_64** 与 **ARM64** 双架构：

| 操作系统 | 硬件架构 | 安装包格式 | 下载渠道 |
| :--- | :--- | :--- | :--- |
| 🪟 **Windows** | x86_64 (常规 PC / Intel / AMD) | 安装向导 (`.exe`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 🪟 **Windows** | ARM64 (骁龙芯片 / Surface Pro X 等) | 安装向导 (`.exe`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 🐧 **Linux** | x86_64 / ARM64 | 通用 AppImage (`.AppImage`) | [Releases](https://github.com/hooosberg/WitNote/releases) |
| 📦 **Linux (Debian/Ubuntu)** | x86_64 / ARM64 | 官方 Deb 包 (`.deb`) | [Releases](https://github.com/hooosberg/WitNote/releases) |

---

## ✨ 核心特性 (v2.0.1)

- 📝 **一切皆文件** — 任意文件夹直接作为笔记库，支持 `.md`、`.txt` 编辑，及 `.pdf`、`.docx`、图片本地预览。
- 🧮 **坚固的 LaTeX 渲染** — 完美支持多行块级公式、对齐环境（aligned）、复杂矩阵与代码高亮，绝无转义崩溃。
- 🛡️ **加固安全防御** — 全面接入 DOMPurify 净化，外链点击自动调用系统默认浏览器安全打开，杜绝应用内白屏。
- 🤖 **轻量 AI 接入** — 自由连接 **Ollama**（本地强大模型）或 **Cloud API**（DeepSeek、OpenAI 等云端接口），支持一键清空会话避免上下文污染。
- 🎨 **极简卡片视觉** — 磨砂玻璃质感、多种精美主题（浅色 / 深色 / 禅意茶色），窗口变窄自动进入沉浸式专注模式。

---

## 🛠️ 源码构建

```bash
# 克隆仓库
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# 安装依赖
npm install

# 启动开发热更新模式
npm run dev

# 打包 Windows 安装包
npm run build:win

# 打包 Linux 安装包
npm run build:linux
```

---

## 📄 开源许可与隐私

- **开源协议**：MIT License。自由使用，开放透明。
- **隐私承诺**：100% 本地存储，无数据上传，无后台遥测，您的文字完全由您掌控。
