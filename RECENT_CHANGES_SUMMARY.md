# 最近开发修改项目总览

这份文档整理了 WitNote 项目最近版本（v1.3.3）的所有主要修改特征，涵盖底层框架、格式扩展、UI 交互及核心功能优化。

## 1. 底层框架与核心优化 (Core Framework & Optimization)

### 🚀 预读取与性能 (Pre-reading & Performance)
- **文件摘要预读取 (Pre-reading):** 实现了 `loadFilePreviews` 机制，在打开文件夹或根目录时，并行预读取前 15 个文本文件（.md/.txt）的内容摘要（前 80 字），为 AI 提供即时的上下文感知能力。
- **目录树递归读取:** 优化了 `readDirectoryTree` 算法，支持递归读取深层目录结构，并对文件和文件夹进行智能分类与排序（文件夹优先，文件按修改时间倒序）。
- **应用启动优化:** 优化了 Electron 主进程初始化流程，减少了应用启动时的白屏时间。

### ⚙️ 系统集成与持久化 (System & Persistence)
- **安全的文件系统访问 (MAS Support):** 引入了 `security-scoped bookmarks` 机制，完美支持 Mac App Store (MAS) 沙盒环境下的文件夹访问权限持久化，解决重启后需要重新选择目录的问题。
- **设置持久化:**
  - 使用 `electron-store` 管理全局应用设置（主题、字体、AI 模型配置）。
  - 使用 `localStorage` 记录 UI 状态（侧边栏宽度、预览模式、上次打开的文件路径），确保用户习惯得以保留。
  - 使用 `.zennote/color_tags.json` 在 Vault 内部持久化存储文件的颜色标记。
- **文件关联 (File Association):**
  - 配置了系统级文件关联，支持双击直接打开 `.md`, `.txt`, `.pdf`, `.docx` 及常见图片格式。
  - 实现了外部文件导入逻辑：当打开 Vault 外部的文件时，自动将其复制到当前 Vault 根目录并打开，规避沙盒权限限制。

## 2. 格式扩展与文件管理 (Format Extensions & Management)

### 📄 多格式支持 (Format Support)
- **扩展的格式兼容:**
  - **可编辑格式:** Markdown (`.md`, `.markdown`), 纯文本 (`.txt`)。
  - **只读预览格式:** PDF (`.pdf`), Word 文档 (`.docx`)。
  - **图像格式:** `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`。
- **智能格式转换 (Smart Conversion):**
  - **TXT ↔ MD:** 实现了无缝格式转换。
  - **智能清洗:** 在将 Markdown 转换为 TXT 时，支持自动剥离 Markdown 语法符号（如去掉 `#` 标题符、`**` 加粗符），保留纯净文本内容。

### 📤 导出与生成 (Export & Generation)
- **PDF 导出:** 集成了 Markdown 转 PDF 功能，支持自定义样式渲染。
- **自动化流:** 导出 PDF 后自动切换视图至生成的 PDF 文件。

## 3. UI 交互与体验 (UI/UX Interactions)

### 🎨 视觉与动画 (Visuals)
- **Finder 风格文件树:**
  - **颜色标记:** 实现了类似 macOS Finder 的红/黄/绿/蓝/无色 标记功能。
  - **拖拽交互:** 支持文件和文件夹的拖拽移动、拖拽进文件夹悬停展开（类似 Finder 交互）。
  - **右键菜单:** 全新的自定义右键菜单，支持重命名、删除、颜色标记、图钉固定。
- **启动屏幕 (Splash Screen):** 优化了启动动画，移除了蒸汽线条，保留简约的咖啡杯 Logo，并实现了平滑的淡出过渡效果。

### 🖥️ 布局与响应式 (Layout)
- **智能三栏布局:**
  - 实现了 `Sidebar` (文件树) - `Editor` (编辑区) - `Chat` (AI 助手) 的三栏结构。
  - **响应式折叠:** 窗口变窄时自动按优先级折叠面板（<1000px 藏 AI 栏，<800px 藏文件栏），进入"专注模式"。
  - **可调整宽度:** 支持拖拽调整侧边栏和 AI 面板的宽度，并自动记忆上次宽度。

### 🖱️ 智能交互 (Smart Interactions)
- **拖拽投递 (Drag & Drop):**
  - **外部文件拖入:** 支持直接将桌面文件拖入侧边栏导入。
  - **全局拖拽提示:** 拖入文件时显示全局遮罩 (`DropZoneOverlay`)，提示释放区域。
- **自动模式切换 (Auto-Switch Mode):**
  - 打开可编辑文件（MD/TXT）时，自动切换到 **编辑模式**。
  - 打开只读文件（PDF/IMG）时，自动切换到 **预览模式**。
- **双击交互:** 文件树支持双击展开/折叠文件夹，单击选中。

## 4. AI 与智能特性 (AI Features)

### 🤖 本地大模型集成
- **双引擎支持:** 同时支持 **Ollama** (本地服务) 和 **WebLLM** (浏览器端运行)，可根据平台（Win/Mac）自动降级或选择。
- **上下文感知:** AI 能够感知当前打开的文件内容 (`activeFileContext`) 以及所在文件夹的所有文件摘要 (`activeFolderContext`)。
- **智能续写:** 支持快捷键 (`Cmd+Shift+A`) 开启/关闭智能续写功能。

