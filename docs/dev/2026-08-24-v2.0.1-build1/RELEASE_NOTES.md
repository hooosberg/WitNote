# WitNote v2.0.1 (Build 1) — 回归纯粹，安全加固与双架构发布

WitNote 正式发布 **v2.0.1 (Build 1)**！本次更新坚守「大智若简，落笔生花」的产品初心，全面加固安全防护、优化基础编辑与渲染体验，并确立了长期的平台分工与全架构二进制分发体系。

---

## 🚀 核心更新亮点

### 1. 🛡️ 核心安全加固与外链防护
- **DOMPurify 安全净化**：在所有 Markdown 与 AI 渲染输出端全面引入 `DOMPurify.sanitize()`，彻底杜绝恶意 Markdown 内容利用 XSS 借道本地 IPC 访问文件的攻击向量。
- **系统默认浏览器打开外链**：修复了在 Markdown 预览区点击外部链接导致应用主界面跳转白屏的体验问题，所有外部 `http://` / `https://` 链接均安全调用系统默认浏览器打开。

### 2. 🧮 LaTeX 多行数学公式稳健渲染 (Issue #14)
- 重构了公式解析与渲染管道，彻底解决多行对齐公式（`\begin{aligned}`、`&` 对齐、`\\` 换行、`_` 下标）被 Markdown 转义破坏导致无法渲染的 Bug，渲染成功率 100%。

### 3. 💬 AI 对话一键清空 (Issue #18)
- 在 AI 对话面板状态栏新增「一键清空会话」快捷按钮，无需进入设置面板即可随时清空对话历史，避免多轮问答带来的上下文污染。

### 4. 🧹 架构精简与轻量化
- 移除实验性内置 WebLLM 引擎及冗余依赖，默认聚焦于性能强劲的 **Ollama (本地强大)** 与 **Cloud API (接入 DeepSeek / OpenAI 等云端大模型)**。

---

## 🍎 平台分工与下载指南

- **🍎 苹果用户 (macOS / iOS)**：
  - WitNote 苹果生态已全面转入 **Swift & SwiftUI 纯原生架构**重写开发，响应速度与能效大幅提升！
  - macOS 用户推荐直接在 **[Mac App Store](https://apps.apple.com/us/app/witnote-local-ai-writer/id6756833873?mt=12)** 搜索下载，享受官方公证与自动静默更新；iOS / iPadOS 原生版正在积极推进研发中。
- **🪟 Windows & 🐧 Linux 用户**：
  - 开源版本提供官方预编译二进制安装包，全面支持 **x86_64** 与 **ARM64** 双架构（见下方附件）。

---

## 📦 二进制安装包资产 (Assets)

- **Windows**:
  - `WitNote-2.0.1-setup-x64.exe` (常规 x64 PC)
  - `WitNote-2.0.1-setup-arm64.exe` (ARM64 / 骁龙 PC)
- **Linux**:
  - `WitNote-2.0.1-x86_64.AppImage` (通用 AppImage)
  - `WitNote-2.0.1-amd64.deb` (Debian / Ubuntu 安装包)
