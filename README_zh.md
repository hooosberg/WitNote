<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="智简笔记本" width="128" height="128">
</p>

# 智简笔记本 (WitNote)

> **大智若简，落笔生花**
> *Smart Core, Simple Form*

[English](README.md) | [中文](README_zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)]()
[![Apple Silicon](https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3%20|%20M4-green.svg)]()

**智简笔记本** 是一款本地优先的 macOS AI 写作伴侣。
我们将强大的**双模 AI 引擎**封装在极致简约的**原生卡片界面**之下。无云端依赖，无隐私焦虑，让智能回归轻盈。

![App Screenshot](docs/screenshot.png)

---

## 🌟 核心理念

- **智 (Smart)**: 双模引擎驱动。
  - **主力**: 自动连接本地 Ollama，满血性能。
  - **便携**: 内置 WebLLM 浏览器模型，开箱即用。
- **简 (Simple)**: 拒绝繁杂。
  - iOS 风格卡片管理，拖拽即整理。
  - 智能专注模式，窗口变窄即刻变身纯文本编辑器。
- **安 (Secure)**: 数据自治。
  - 100% 本地存储，你的思想只属于你。

---

## ✨ 功能亮点

- 📝 **纯本地笔记** — 选择任意文件夹作为笔记库，支持 `.txt` 和 `.md`
- 🤖 **双模 AI 引擎** — WebLLM (轻量内置) + Ollama (强力扩展)
- 🎨 **多主题切换** — 浅色 / 深色 / 禅意茶色
- 🗂️ **卡片网格视图** — iOS 风格，拖拽排序
- 🔍 **上下文感知** — AI 可直接读取当前文章
- 🎯 **专注模式** — 窗口变窄自动切换
- 🌍 **国际化支持** — 中英文双语

---

## 🚀 快速开始

### 安装

从 [Releases](https://github.com/hooosberg/WitNote/releases) 下载最新的 DMG 安装包。

**推荐平台**: Apple Silicon (M1 / M2 / M3 / M4 系列芯片) 的 Mac 设备

### 开发

```bash
# 克隆仓库
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 🔧 AI 引擎配置

### WebLLM (内置)
开箱即用，无需配置。首次使用会自动下载轻量模型。

### Ollama (推荐)
如需更强大的 AI 能力，推荐安装 [Ollama](https://ollama.com)：

```bash
# 安装 Ollama 后，下载推荐模型
ollama pull qwen2.5:0.5b
# 或更大的模型
ollama pull qwen2.5:3b
```

应用会自动检测本地 Ollama 服务并优先使用。

---

## 📸 截图

*(待添加)*

---

## 📄 开源协议

MIT License

---

## 👨‍💻 开发者

**hooosberg**

📧 [zikedece@proton.me](mailto:zikedece@proton.me)

🔗 [https://github.com/hooosberg/WitNote](https://github.com/hooosberg/WitNote)

---

<p align="center">
  <i>大智若简，落笔生花</i>
</p>
