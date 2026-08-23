# WitNote 开源版本 — 开发档案 (v2.0.1 Build 1)

> 当前版本：v2.0.1 (Build 1)
> 周期标识：2026-08-24-v2.0.1-build1
> 维护者：[@hooosberg](https://github.com/hooosberg)
> 官网：[hooosberg.com/apps/witnote](https://hooosberg.com/apps/witnote/)
> 仓库：[github.com/hooosberg/WitNote](https://github.com/hooosberg/WitNote)

---

## 一、产品定位（重新梳理）

WitNote 开源版本的核心定位：

> **本地 Markdown 笔记本 + 轻量 AI 辅助**

### 做什么
- 以文件夹为单位管理 `.md` / `.txt` 文件（知识库模式）
- Markdown 编辑与预览（支持 GFM、KaTeX 数学公式、图片）
- 格式转换（Markdown → PDF / DOCX 预览）
- AI 辅助聊天（Ollama 本地模型 / Cloud API 云端接口）
- **专注于打造简单、干净、纯粹的本地 Markdown 编辑器，并长期保持持续开发**

### 不做什么（边界）
- 不做云同步、账号体系
- 不做重度复杂的 AI Agent，AI 定位为轻量写作伴侣
- **从 v2.0.1 (Build 1) 起去除 macOS DMG 封装打包**，减轻打包维护压力，开源构建全面聚焦 **Windows 与 Linux**

### 与苹果商店版本的关系
| 维度 | 开源版（本仓库） | 苹果商店版（闭源） |
|------|----------------|-----------------|
| 技术栈 | Electron + React + TypeScript | SwiftUI 纯原生 |
| 目标平台 | **Windows & Linux**（长期持续维护） | **macOS / iOS / iPadOS**（原生体系） |
| 分发渠道 | GitHub Releases（EXE / AppImage / Deb）| Mac App Store / App Store |
| 授权模式 | MIT 开源 | 闭源商业 |
| AI 引擎 | Ollama + Cloud API | 独立原生实现 |
| 核心定位 | 简单干净的本地 Markdown 知识库 | 深度集成的 Apple 生态原生笔记 |

---

## 二、代码结构

```
WitNote/
├── electron/               # 主进程（Node.js）
│   ├── main.ts             # 应用入口、IPC 处理、文件系统、Ollama 调用
│   └── preload.ts          # contextBridge 接口暴露（renderer ↔ main）
│
├── src/                    # 渲染进程（React + TypeScript）
│   ├── App.tsx             # 根组件，布局管理（三栏：FileTree / Editor / ChatPanel）
│   ├── components/         # UI 组件
│   │   ├── Editor.tsx      # 编辑器（编辑/预览/分屏三模式，KaTeX，图片处理）
│   │   ├── ChatPanel.tsx   # AI 对话面板
│   │   ├── AIDialog.tsx    # 内联 AI 编辑弹窗（选中文字 → AI 处理）
│   │   ├── FileTree.tsx    # 文件树（颜色标签、拖拽、上下文菜单）
│   │   ├── Settings.tsx    # 设置面板
│   │   ├── Sidebar.tsx     # 左侧边栏（卡片视图）
│   │   └── viewers/        # 只读预览（PDF、DOCX）
│   │
│   ├── engines/            # AI 引擎实现
│   │   ├── WebLLMEngine.ts # WebLLM 内置模型（待评估是否移除）
│   │   └── OpenAIEngine.ts # OpenAI 兼容接口（Cloud API / Ollama）
│   │
│   ├── hooks/              # 业务 Hooks
│   │   ├── useFileSystem.ts # 文件系统操作（读写、监听变化）
│   │   ├── useLLM.ts        # AI 引擎调度
│   │   ├── useSettings.ts   # 设置持久化
│   │   └── useAutocomplete.ts # AI 自动续写
│   │
│   ├── store/              # 状态管理
│   │   └── engineStore.ts  # AI 引擎状态
│   │
│   ├── locales/            # 多语言（8 种语言）
│   └── utils/              # 工具函数（导出、文件能力检测等）
│
├── build/                  # 构建产物配置（electron-builder）
├── scripts/                # 构建脚本
├── i18n/                   # 多语言 README（18 种语言）
└── docs/
    └── dev/                # 开发文档（本目录）
        ├── ROADMAP.md      # 本文件：开发档案 & 路线图
        ├── ISSUES.md       # GitHub Issues 整理与回复记录
        └── SECURITY.md     # 安全漏洞修复记录
```

---

## 三、WebLLM 内置引擎去留讨论

### 现状
- WebLLM 内置模型（qwen2.5:0.5b）首次需下载 ~300-500MB
- 仅在 macOS Apple Silicon 上可用，Windows/Linux 用户无法使用
- 模型参数量小（0.5B），写作辅助质量有限
- 代码复杂度高，引入了大量 WebGPU 依赖

### GitHub Issues 中的相关反馈
- **#8**：用户询问 WebLLM 是否可以下载使用（使用门槛高）
- **#19**：用户反映内置模型效果差，想用 DeepSeek

### 结论建议
> **移除 WebLLM，只保留 Ollama + Cloud API 两个引擎**

理由：
1. 跨平台开源版本应以**通用性**优先，WebLLM 只对 macOS Apple Silicon 有效
2. 模型效果差，反而给用户留下负面印象
3. 删除后可大幅减小安装包体积（移除 WebGPU 相关依赖）
4. Ollama（本地强模型）和 Cloud API（接 DeepSeek/GPT 等）已能覆盖所有场景

**待办**：移除 `src/engines/WebLLMEngine.ts`、`src/engines/webllmModels.ts`，清理相关 UI 入口。

---

## 四、已知 Bug 与待修复列表

### 🔴 高优先级

| # | 问题 | 状态 |
|---|------|------|
| 安全 | Markdown 预览 XSS 漏洞（`Editor.tsx` / `AIDialog.tsx` 未 sanitize）| ✅ 已修复（2026-08-24）|
| #18 | Markdown 预览中链接在应用内打开，无法返回 | 待修复 |
| #14 | 多行块级 KaTeX 公式（`$$...$$`）渲染与 Typora 不一致 | 待修复 |

### 🟡 中优先级

| # | 问题/功能 | 状态 |
|---|----------|------|
| #18 | AI 对话框缺少「清空会话」快捷按钮 | 待实现 |
| #13 | AI 回答可一键写入文档（更流畅的内联编辑）| 已有初步实现，可增强 |
| — | 移除 WebLLM 引擎 | 待实施 |

### 🟢 功能请求（社区驱动）

| # | 请求 | 评估 |
|---|------|------|
| #17 | 更详细的字数统计（段落数、阅读时间）| 状态栏已有基础统计，可增强 |
| #15 | 拓展 AI 功能（用户尚未具体说明）| 等待用户补充 |
| #19 | 支持更多 AI 模型 | Cloud API 已支持任意 OpenAI 兼容接口 |
| #5 | Linux 版本 | ✅ 已支持（AppImage / .deb）|
| #4 | 手机版 | 苹果商店闭源版正在开发 iOS，开源版暂无计划 |

---

## 五、近期变更记录

### 2026-08-24
- 🔒 **安全修复**：修复 `Editor.tsx` 和 `AIDialog.tsx` 中 Markdown 渲染未 sanitize 导致的 XSS/IPC 攻击漏洞，新增 `DOMPurify.sanitize()` 调用
- 🔗 **URL 更新**：将所有 `hooosberg.github.io/WitNote/` 替换为 `hooosberg.com/apps/witnote/`（覆盖 README、i18n README × 18、electron/main.ts、Settings.tsx）
- 📁 **本地目录整理**：开源版本与苹果商店版本正式分离，独立 git 仓库管理

---

## 六、开发环境

```bash
# 克隆仓库
git clone https://github.com/hooosberg/WitNote.git
cd WitNote

# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 构建 macOS 版本
npm run build

# 构建 Windows 版本
npm run build -- --win

# 构建 Linux 版本
npm run build -- --linux
```

**技术栈：** Electron 33 · React 18 · TypeScript · Vite · electron-builder
