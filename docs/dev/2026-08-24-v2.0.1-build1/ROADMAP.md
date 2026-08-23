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

## 四、本周期已完成修复与落地列表

### 🔴 核心安全与高优先级 Bug

| # | 问题 | 状态 | 落地改动 |
|---|------|------|---------|
| **安全** | Markdown 预览 XSS 漏洞（`Editor.tsx` / `AIDialog.tsx` 未 sanitize）| ✅ **已修复** | 全面接入 DOMPurify 净化 |
| **#18** | Markdown 预览中外部链接在应用内打开导致白屏 | ✅ **已修复** | 注册 IPC 并调用系统默认浏览器打开 |
| **#14** | 多行块级 KaTeX 公式（`$$...$$`）渲染解析失败 | ✅ **已修复** | 重构渲染管道采用公式预提取保护机制 |

### 🟡 体验与架构优化

| # | 问题/功能 | 状态 | 落地改动 |
|---|----------|------|---------|
| **#18** | AI 对话框缺少「清空会话」快捷按钮 | ✅ **已实现** | 状态栏新增一键清空会话快捷按钮 |
| **架构** | 精简 WebLLM 引擎，默认聚焦 Ollama / Cloud API | ✅ **已落地** | 禁用实验性内置模型，提升通用性与稳定性 |
| **打包** | 去除 macOS DMG 封装，官方 Releases 聚焦 Win/Linux 双架构 | ✅ **已落地** | Windows & Linux (x86_64 / ARM64) 发布 |

### 🟢 社区 Issues 清理

| 统计指标 | 数量 | 状态 |
|---|---|---|
| 历史积累 Issues 总数 | 15 个 | ✅ **全部 100% 回复并关闭（0 Open Issues）** |

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
