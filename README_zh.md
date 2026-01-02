<p align="center">
  <img src="src/icon/智简icon 拷贝.png" alt="智简笔记本" width="128" height="128">
</p>

<h1 align="center">智简笔记本</h1>

<p align="center">
  <strong>大智若简，落笔生花</strong>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_zh.md">中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/arch-x64%20|%20ARM64-blue.svg" alt="Architecture">
</p>

> **🎉 即将登陆 Mac App Store！**
> 
> 本应用完全符合 Apple 安全与隐私标准，目前正在审核中。请大家多多支持，您的 Star ⭐️ 是我们最大的动力！

**智简笔记本** 是一款本地优先的 AI 写作伴侣，支持 macOS、Windows 和 Linux 平台。
支持 **Ollama / WebLLM / 云端 API** 三种引擎自由切换，搭配极简**原生卡片界面**，开箱即用。除模型下载外无云端依赖，无隐私焦虑，让智能回归轻盈。

![本地 AI](src/pic/witnote%20宣传截图/中文版设计/本地离线ai.jpg)

---

## 🌟 核心理念

- **智 (Smart)**: 三擎合一，自由选择。
  - **WebLLM**: 轻量级模型，首次需联网下载，之后完全离线可用。
  - **Ollama**: 本地强大模型，性能强劲，完全离线。
  - **Cloud API**: 连接云端智慧，无限可能。
- **简 (Simple)**: 拒绝繁杂。
  - iOS 风格卡片管理，拖拽即整理。
  - 智能专注模式，窗口变窄即刻变身纯文本编辑器。
- **安 (Secure)**: 数据自治。
  - [**隐私政策**](PRIVACY.md)：100% 本地存储，你的思想只属于你。

---

## ✨ 功能亮点 (v1.3.0)

- 📝 **纯本地笔记** — 选择任意文件夹作为笔记库，支持 `.txt` 和 `.md`
- 🤖 **三擎合一** — 自由切换 **WebLLM** (轻量)、**Ollama** (本地强力) 或 **云端 API** (自定连接)
- 🎭 **丰富角色库** — 内置 10+ 种精选角色提示词 (写作、翻译、润色等)，支持一键切换与自定义
- 🌍 **全球沟通** — **支持 8 种语言**: 
  - 简体中文, English, 繁體中文, 日本語, 한국어, Français, Deutsch, Español
  - 界面与 AI 回复自动适配您的语言设置
- 🔒 **隐私优先** — 所有 AI 推理在本地完成 (使用本地引擎时)，无数据上传，通过 Apple 官方公证
- 💬 **高度定制** — 可自由编辑系统提示词，打造专属 AI 助手
- 🎨 **多主题切换** — 浅色 / 深色 / 禅意茶色，深色模式全面优化
- 🗂️ **卡片网格视图** — iOS 风格，拖拽排序，上下文菜单完善
- 🔍 **上下文感知** — AI 可直接读取当前文章或文件夹内容
- 🎯 **专注模式** — 窗口变窄自动切换纯文本编辑体验
- 🌓 **双栏预览** — 所见即所得，左侧编辑右侧实时预览
- 🖼️ **图片插入** — 支持粘贴、拖拽、菜单插入图片
- ⚡️ **快捷编辑** — 悬浮菜单增强，选中文字快速修改格式

---

## 🚀 快速开始

### 下载

从 [Releases](https://github.com/hooosberg/WitNote/releases) 下载最新安装包：

| 🍎 macOS | `WitNote-1.3.0.dmg` | 仅支持 Apple Silicon (M1/M2/M3) |
| 🪟 Windows | `WitNote-1.3.0-setup.exe` | 自动识别 x64 / ARM64 (二合一) |
| 🐧 Linux | `WitNote-1.3.0-x86_64.AppImage` | x64 通用格式 (另有 ARM64 版本) |
| 📦 Linux (Deb) | `WitNote-1.3.0-amd64.deb` | Ubuntu/Debian x64 (另有 ARM64 版本) |

---

## 💻 设备要求

### 🍎 macOS

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 系统版本 | macOS 12.0+ | macOS 13.0+ |
| 芯片 | **不予支持 (Intel 芯片)** | **Apple Silicon (M1/M2/M3/M4)** |
| 内存 | - | 16GB+ |
| 硬盘 | - | SSD, 4GB+ 可用空间 |

> ❌ **关于 Intel Mac 的重要说明**: 
> 
> 本应用 **不支持** Intel 芯片的 Mac 电脑。即便强制运行，也会因以下原因导致极差体验：
> 1. **底层架构不兼容**: 内置的本地推理引擎 (WebLLM/Ollama) 深度依赖 Apple Silicon 的 ARM64 架构与 NPU/Metal 硬件加速。
> 2. **硬件加速缺失**: Intel Mac 缺乏统一内存架构，运行量化模型速度极慢（生成一个字可能需数秒），且会导致设备严重发热。
> 3. **架构取舍**: 为了保证最佳体验与包体积，我们移除了对 x86_64 架构的支持。
> 
> 强烈建议使用搭载 Apple Silicon (M系列) 芯片的 Mac 设备。

### 🪟 Windows

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 系统版本 | Windows 10 (64-bit) | Windows 11 |
| 处理器 | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| 内存 | 8GB | 16GB+ |
| 硬盘 | 2GB 可用空间 | SSD, 4GB+ 可用空间 |
| 显卡 | 集成显卡 | 支持 Vulkan 的独立显卡 |

> ⚠️ **注意**: Windows ARM64 设备 (如 Surface Pro X) 现已原生支持！

### 🐧 Linux

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 系统版本 | Ubuntu 20.04+ / Debian 11+ | 最新版主流发行版 |
| 架构 | x64 / ARM64 | x64 / ARM64 |
| 内存 | 8GB | 16GB+ |

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

### 🐧 Linux 安装

**AppImage (通用):**
1. 下载 `.AppImage` 文件
2. 右键属性 -> 允许作为程序执行 (或 `chmod +x WitNote*.AppImage`)
3. 双击运行

**Deb (Ubuntu/Debian):**
1. 下载 `.deb` 文件 (如 `WitNote-1.3.0-amd64.deb`)
2. 在终端运行安装命令 (这将自动处理依赖):
   ```bash
   sudo apt install ./WitNote-1.3.0-amd64.deb
   ```

> 📝 **注意事项 (Windows 用户必读)**:
> 
> 由于个人开发者暂时无法申请昂贵的 EV 代码签名证书，安装时可能会遇到以下提示，请按步骤操作：
> 1. **SmartScreen 拦截**：如果弹出"Windows 已保护你的电脑"（未知名开发者），请点击 **"更多信息"** -> **"仍要运行"**。
> 2. **杀毒软件提示**：可能会被 Windows Defender 或 360 等误报。请放心，项目完全开源且安全，如遇阻拦建议暂时关闭杀毒软件。

---

## 🔧 AI 引擎说明

### 1. WebLLM (轻量)
应用内置 WebLLM 引擎，默认搭载 `qwen2.5:0.5b` 模型（macOS 专用，Windows 推荐使用 Ollama）。
- **优点**: 无需安装任何额外软件，首次自动下载模型后即可完全离线使用。
- **适用**: 快速问答、简单文本润色，低配置电脑首选。

### 2. Ollama (本地强力)
支持连接本地运行的 Ollama 服务。
- **优点**: 可运行 7B、14B 甚至更大的模型，性能强大，完全离线。
- **使用**: 需先安装 [Ollama](https://ollama.com)，然后在设置中下载更多模型 (如 qwen2.5:7b, llama3等)。

### 3. Cloud API (云端无限)
支持连接兼容 OpenAI 格式的云端 API。
- **优点**: 只要有 API Key，即可使用地球上最强大的模型。
- **适用**: 需要顶级逻辑推理能力的场景，或者电脑配置较低无法运行大模型时。
- **配置**: 在设置中填入 API 地址和 Key 即可 (支持 OpenAI, Gemini, DeepSeek, Moonshot 等)。

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

### 🔄 三种引擎自由切换
![三种引擎自由切换](src/pic/witnote%20宣传截图/中文版设计/三种引擎自由切换.jpg)

### 🎭 多角色提示词
![多角色提示词](src/pic/witnote%20宣传截图/中文版设计/多角色提示词.jpg)

### ⌨️ 快捷键
![快捷键](src/pic/witnote%20宣传截图/中文版设计/快捷键.jpg)

### 🌓 双栏实时预览
![双栏实时预览](src/pic/witnote%20宣传截图/中文版设计/双栏实时预览.jpg)

### 🖼️ 插入图片
![插入图片](src/pic/witnote%20宣传截图/中文版设计/插入图片.jpg)

### ⚡️ 快捷编辑
![快捷编辑](src/pic/witnote%20宣传截图/中文版设计/快捷编辑.jpg)

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

📖 [开发学习日记](public/dev-diaries/dev-diary_zh.md)

---

<p align="center">
  <i>大智若简，落笔生花</i>
</p>
