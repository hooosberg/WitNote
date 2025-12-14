# 禅意笔记本 - 开发进度报告

> 本地优先的 AI 记事本，支持双模 AI 引擎（WebLLM + Ollama）

---

## 📌 当前版本: v0.2.1-alpha

**最后更新**: 2024-12-14 18:28

---

## ✅ Phase 1: 双模 AI 引擎 (已完成)

- [x] 项目初始化 (Electron + Vite + React)
- [x] macOS vibrancy 窗口效果
- [x] LLM 服务抽象层
- [x] Ollama 自动检测
- [x] WebLLM 降级支持
- [x] iMessage 风格聊天界面

---

## ✅ Phase 2: 数据核心 (已完成)

### A. 智能文件系统

- [x] **首次启动引导** (`Onboarding.tsx`)
  - 全屏引导页，让用户选择笔记根目录
  - 使用 `electron-store` 持久化 vault 路径

- [x] **IPC 通信层** (`main.ts`, `preload.ts`)
  - 完整的文件系统 API (读/写/创建/删除/重命名)
  - `chokidar` 实时监听文件变化
  - 自动忽略 `.DS_Store`, `.git`, `node_modules`, `.zennote`

- [x] **递归文件树** (`FileTree.tsx`)
  - 文件夹展开/收起
  - 选中态高亮
  - 只显示 `.txt` 和 `.md` 文件

- [x] **格式热切换**
  - `.txt` ↔ `.md` 一键切换
  - 内容保持不变

### B. 聊天持久化 (Sidecar 模式)

- [x] **存储策略**
  - 隐藏目录: `.zennote/chats/`
  - 文件路径 Base64 编码作为 Key
  - JSON 格式存储聊天记录

- [x] **自动同步**
  - 打开文件时自动加载聊天记录
  - AI 回复后自动保存

### C. 上下文桥接 (Context Bridge)

- [x] **上下文注入**
  - 读取当前编辑文件内容 (限制 4000 字符)
  - 动态构建 System Prompt
  - AI 可以理解文件内容

- [x] **视觉反馈**
  - `ContextIndicator` 显示 "👁️ Reading: [文件名]"
  - 欢迎消息动态变化

### D. 实时心跳检测

- [x] **轮询机制**
  - 3 秒间隔检测 Ollama 状态
  - 连续 2 次失败触发降级

- [x] **热切换状态机**
  - Ollama 离线 → 自动切换 WebLLM
  - Ollama 上线 → 自动切换回 Ollama

- [x] **Toast 通知**
  - 引擎切换时显示浮动通知
  - 优雅的进入/退出动画

---

## 📁 项目结构 (Phase 2)

```
禅意笔记本/
├── electron/
│   ├── main.ts           # IPC + chokidar + electron-store
│   └── preload.ts        # contextBridge API
├── src/
│   ├── components/
│   │   ├── Onboarding.tsx      # 首次启动引导
│   │   ├── FileTree.tsx        # 递归文件树
│   │   ├── Toast.tsx           # 通知系统
│   │   ├── ContextIndicator.tsx # 上下文指示器
│   │   ├── ChatPanel.tsx       # 聊天面板
│   │   ├── StatusIndicator.tsx # 状态指示器
│   │   └── Editor.tsx          # 文本编辑器
│   ├── hooks/
│   │   ├── useFileSystem.ts    # 文件系统 Hook
│   │   └── useLLM.ts           # LLM 核心 Hook
│   ├── services/
│   │   ├── types.ts            # 类型定义
│   │   ├── OllamaService.ts    # Ollama 客户端
│   │   ├── WebLLMService.ts    # WebLLM 封装
│   │   └── llm.worker.ts       # Web Worker
│   └── styles/
│       └── index.css           # 全局样式
├── package.json
└── CHANGELOG.md
```

---

## 📝 版本历史

### v0.2.0-alpha (2024-12-14)

**新增**
- 首次启动引导页
- 递归文件树
- 文件实时监听 (chokidar)
- 聊天记录持久化 (Sidecar 模式)
- 上下文注入 (AI 可读取当前文件)
- 心跳检测 (实时 Ollama 状态监测)
- Toast 通知系统
- 格式热切换 (.txt ↔ .md)

**改进**
- 重构 `useLLM` Hook
- 添加自动保存 (1秒防抖)
- 改进错误处理和日志

---

### v0.1.0-alpha (2024-12-14)

**新增**
- 初始化项目结构
- 双模 AI 引擎架构
- macOS 原生视觉风格

---

## 🚧 Phase 3: 待开发功能

- [ ] 笔记搜索功能
- [ ] AI 笔记摘要
- [ ] 文件夹创建/删除
- [ ] 拖拽排序
- [ ] 导出功能 (PDF/HTML)
- [ ] 深色模式优化
- [ ] 快捷键支持

---

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

---

## 🐛 已知问题

1. WebGPU 兼容性可能因 Mac 机型而异
2. 首次加载 WebLLM 模型需要下载权重文件 (~300MB)
3. 需要手动安装 Ollama 才能使用本地模型
