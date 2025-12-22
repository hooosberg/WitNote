<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="智简笔记本" width="128" height="128">
</p>

<h1 align="center">智简笔记本 (WitNote)</h1>

<p align="center">
  <strong>大智若简，落笔生花</strong><br>
  <i>Smart Core, Simple Form</i>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/Apple%20Silicon-M1%20|%20M2%20|%20M3-green.svg" alt="Apple Silicon">
</p>

> **🎉 即将登陆 Mac App Store！**
> 
> 本应用完全符合 Apple 安全与隐私标准，目前正在审核中。请大家多多支持，您的 Star ⭐️ 是我们最大的动力！

**智简笔记本** 是一款本地优先的 AI 写作伴侣，支持 macOS 和 Windows 平台。
内置 **Ollama AI 引擎**，搭配极简**原生卡片界面**，开箱即用。无云端依赖，无隐私焦虑，让智能回归轻盈。

![本地 AI](src/pic/witnote%20宣传截图/中文版设计/本地离线ai.jpg)

---

## 🌟 核心理念

- **智 (Smart)**: 本地 AI，开箱即用。
  - 内置 Ollama 引擎，自动启动，即刻可用。
  - 预装轻量模型，无需额外配置。
- **简 (Simple)**: 拒绝繁杂。
  - iOS 风格卡片管理，拖拽即整理。
  - 智能专注模式，窗口变窄即刻变身纯文本编辑器。
- **安 (Secure)**: 数据自治。
  - [**隐私政策**](PRIVACY.md)：100% 本地存储，你的思想只属于你。

---

## ✨ 功能亮点 (v1.2.1)

- 📝 **纯本地笔记** — 选择任意文件夹作为笔记库，支持 `.txt` 和 `.md`
- 🤖 **本地 AI 引擎** — 内置 Ollama，支持下载 10+ 种主流模型 (Qwen, Llama, Gemma 等)
- 🌍 **全球沟通** — **支持 8 种语言**: 
  - 简体中文, English, 繁體中文, 日本語, 한국어, Français, Deutsch, Español
  - 界面与 AI 回复自动适配您的语言设置
- 🔒 **隐私优先** — 所有 AI 推理在本地完成，无数据上传，通过 Apple 官方公证
- 💬 **可定制 AI 角色** — 可编辑系统提示词，一键恢复默认
- 🎨 **多主题切换** — 浅色 / 深色 / 禅意茶色，深色模式全面优化
- 🗂️ **卡片网格视图** — iOS 风格，拖拽排序，上下文菜单完善
- 🔍 **上下文感知** — AI 可直接读取当前文章或文件夹内容
- 🎯 **专注模式** — 窗口变窄自动切换纯文本编辑体验

---

## 🚀 快速开始

### 下载

从 [Releases](https://github.com/hooosberg/WitNote/releases) 下载最新安装包：

| 平台 | 文件 | 说明 |
|------|------|----------|
| 🍎 macOS | `WitNote-x.x.x.dmg` | Apple Silicon 优化 |
| 🪟 Windows | `WitNote-x.x.x-setup.exe` | 64 位 Windows 10/11 |

---

## 💻 设备要求

### 🍎 macOS

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 系统版本 | macOS 10.15+ | macOS 12.0+ |
| 芯片 | Intel Core i5 | Apple Silicon (M1/M2/M3/M4) |
| 内存 | 8GB | 16GB+ |
| 硬盘 | 2GB 可用空间 | SSD, 4GB+ 可用空间 |

> 💡 **提示**: Apple Silicon 设备运行本地 AI 模型性能更佳，强烈推荐！

### 🪟 Windows

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 系统版本 | Windows 10 (64-bit) | Windows 11 |
| 处理器 | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| 内存 | 8GB | 16GB+ |
| 硬盘 | 2GB 可用空间 | SSD, 4GB+ 可用空间 |
| 显卡 | 集成显卡 | 支持 Vulkan 的独立显卡 |

> ⚠️ **注意**: Windows 版本为首次发布，欢迎反馈问题！

---

## 📦 安装说明

### 🍎 macOS 安装

1. 下载 `.dmg` 文件
2. 双击打开 DMG
3. 将应用拖入 Applications 文件夹
4. 首次运行可能需要信任开发者（见下方说明）

> 🎉 **好消息！**
>
> 本应用已通过 **Apple 官方公证 (Notarization)**！不会再出现"无法验证开发者"的提示了！
>
> 😅 *~~开发者为此斥巨资借了花呗 $99 购买 Apple Developer 账号...~~*
> *（没错，这是一个真实故事，感谢用户们的支持让我有底气还花呗）*

### 🪟 Windows 安装

1. 下载 `.exe` 安装程序
2. 双击运行安装向导
3. 选择安装路径（可自定义）
4. 完成安装，从桌面或开始菜单启动

> 📝 **注意事项 (Windows 用户必读)**:
> 
> 由于个人开发者暂时无法申请昂贵的 EV 代码签名证书，安装时可能会遇到以下提示，请按步骤操作：
> 1. **SmartScreen 拦截**：如果弹出"Windows 已保护你的电脑"（未知名开发者），请点击 **"更多信息"** -> **"仍要运行"**。
> 2. **杀毒软件提示**：可能会被 Windows Defender 或 360 等误报。请放心，项目完全开源且安全，如遇阻拦建议暂时关闭杀毒软件。
> 3. **管理员运行**：建议安装时右键选择"以管理员身份运行"。

---

## 🔧 AI 引擎说明

### 开箱即用
应用内置了 Ollama 引擎和 `qwen2.5:0.5b` 轻量模型，首次启动即可使用，无需任何配置。

### 扩展更多模型
如需更强大的 AI 能力，可在设置中下载更多模型：

| 模型 | 大小 | 适用场景 |
|------|------|----------|
| qwen2.5:0.5b | ~400MB | 快速问答（已内置）|
| qwen2.5:1.5b | ~1GB | 日常写作辅助 |
| qwen2.5:3b | ~2GB | 深度写作、长文创作 |

---

## 📸 截图

### 🎯 专注模式
![专注模式](src/pic/witnote%20宣传截图/中文版设计/专注模式.jpg)

### 🎨 多种主题
![多种主题](src/pic/witnote%20宣传截图/中文版设计/多种主题.jpg)

### 🤖 本地离线 AI
![本地离线AI](src/pic/witnote%20宣传截图/中文版设计/本地离线ai.jpg)

### 💾 本地离线存储
![本地存储](src/pic/witnote%20宣传截图/中文版设计/本地离线存储.jpg)

### 🔄 格式转换
![格式转换](src/pic/witnote%20宣传截图/中文版设计/格式转换.jpg)

### 📥 模型下载
![模型下载](src/pic/witnote%20宣传截图/中文版设计/模型下载.jpg)

### 👤 角色自定义
![角色自定义](src/pic/witnote%20宣传截图/中文版设计/角色自定义.jpg)

---

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建 macOS 版本
npm run build

# 构建 Windows 版本
npm run build -- --win
```

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
