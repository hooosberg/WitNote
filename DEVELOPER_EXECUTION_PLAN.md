# WitNote 多模型分发执行计划 (Multi-Model Dispatch Plan)

> **文档目的**: 按 AI 模型能力分配开发任务，支持分批次、分模型执行
> 
> **技术栈**: React + TypeScript + Electron + Vite
> 
> **最后更新**: 2026-01-05

---

## 📊 执行进度总览

| 批次 | 推荐模型 | 任务数 | 进度 |
|------|---------|-------|------|
| Batch 1 | Claude Opus 4.5 (Thinking) | 4 | ✅ 100% |
| Batch 2 | Claude Sonnet 4.5 (Thinking) | 3 | ⚪ 0% |
| Batch 3 | Claude Sonnet 4.5 / Gemini Pro High | 3 | ⚪ 0% |
| Batch 4 | Gemini Pro Low / GPT-OSS 120B | 3 | 🟡 33% |
| Batch 5 | Gemini 3 Flash | 7 | ⚪ 0% |

---

## 🔴 Batch 1: 核心架构任务

**推荐模型**: `Claude Opus 4.5 (Thinking)`

> [!IMPORTANT]
> 此批次必须首先完成，后续批次依赖这里建立的状态基础设施。

---

### T1-1: 扩展全局状态 - 添加 previewFile

**文件**: `src/hooks/useFileSystem.ts`

**任务描述**:
1. 在 `UseFileSystemReturn` 接口添加 `previewFile` 和 `setPreviewFile`
2. 添加 `isEditable(file)` 辅助方法
3. 使用现有 `EDITABLE_EXTENSIONS` 常量判断

**代码片段**:
```typescript
// 接口扩展
previewFile: FileNode | null
setPreviewFile: (file: FileNode | null) => void
isEditable: (file: FileNode) => boolean

// 实现
const [previewFile, setPreviewFile] = useState<FileNode | null>(null)

const isEditable = useCallback((file: FileNode): boolean => {
  const ext = file.extension?.toLowerCase() || ''
  return EDITABLE_EXTENSIONS.includes(ext)
}, [])
```

**验收标准**:
- [ ] `previewFile` 可独立于 `activeFile` 设置
- [ ] `isEditable` 正确判断 `.md` / `.txt` 返回 true

---

### T1-2: 实现双栏布局逻辑

**文件**: `src/App.tsx`

**任务描述**:
1. 添加 `layoutMode` 计算逻辑
2. 条件渲染双栏/单栏布局
3. 使用前一任务导出的 `previewFile` 状态

**代码片段**:
```tsx
const layoutMode = useMemo(() => {
  return (activeFile && previewFile) ? 'dual' : 'single'
}, [activeFile, previewFile])

// 渲染
{layoutMode === 'dual' ? (
  <div className="dual-pane-layout">
    <div className="main-pane"><SmartFileViewer file={activeFile} /></div>
    <div className="pane-divider" />
    <div className="preview-pane"><SmartFileViewer file={previewFile} /></div>
  </div>
) : (
  <SmartFileViewer file={activeFile} />
)}
```

**验收标准**:
- [ ] 同时存在 activeFile 和 previewFile 时显示双栏
- [ ] 仅有一个文件时显示单栏

---

### T1-3: 点击参考文件推入右栏

**文件**: `src/App.tsx`

**任务描述**:
修改 `handleFileSelect` 逻辑，当编辑可编辑文件时点击只读文件，推入右栏预览

**代码片段**:
```typescript
const handleFileSelect = useCallback((node: FileNode) => {
  const isNodeEditable = isEditable(node)
  
  // 场景 A：正在编辑可编辑文件，点击只读文件
  if (activeFile && isEditable(activeFile) && !isNodeEditable) {
    setPreviewFile(node)
    return
  }
  
  // 场景 B：点击可编辑文件
  if (isNodeEditable) {
    setPreviewFile(null)
    setActiveFile(node)
    return
  }
  
  // 默认：作为主文件打开
  setActiveFile(node)
}, [activeFile, isEditable])
```

**验收标准**:
- [ ] 编辑 MD 时点击 PDF → PDF 出现在右栏
- [ ] 点击 MD 时清除右栏预览

---

### T1-4: 新建文件时自动分栏

**文件**: `src/App.tsx`

**任务描述**:
修改 `handleQuickCreate` 逻辑，阅读只读文件时新建 → 原文件移至右栏

**代码片段**:
```typescript
const handleQuickCreate = useCallback(async () => {
  const currentFile = activeFile
  const shouldSplit = currentFile && !isEditable(currentFile)
  
  const newFile = await createFile(activeFolder?.path)
  
  if (newFile) {
    if (shouldSplit) {
      setPreviewFile(currentFile)
    }
    setActiveFile(newFile)
  }
}, [activeFile, activeFolder, createFile, isEditable])
```

**验收标准**:
- [ ] 阅读 PDF 时新建 → PDF 移到右栏，左栏为新 MD

---

## 🟠 Batch 2: 重要功能开发

**推荐模型**: `Claude Sonnet 4.5 (Thinking)`

---

### T2-1: FilePropertiesMenu 组件

**新建文件**: `src/components/FilePropertiesMenu.tsx`

**任务描述**:
创建文件属性菜单组件，包含：
- 当前文件格式显示
- 只读模式提示
- "在系统应用中打开" 按钮
- 格式转换选项

**Props 接口**:
```typescript
interface FilePropertiesMenuProps {
  file: FileNode
  isOpen: boolean
  onClose: () => void
  onOpenInSystemApp: () => void
  onConvertFormat: (format: string) => void
}
```

---

### T2-2: 格式转换确认弹窗

**文件**: `src/App.tsx` (或相关处理文件)

**任务描述**:
复用现有 `ConfirmDialog`，MD → TXT 转换时显示警告

**文案**:
```
标题: 确认转换
内容: 转换为纯文本将丢失所有 Markdown 格式，此操作不可撤销。
按钮: [取消] [确认转换]
```

---

### T2-3: 验证 readFileBuffer IPC

**文件**: `electron/main.ts`, `electron/preload.ts`

**任务描述**:
1. 检查是否已实现 `read-file-buffer` IPC handler
2. 如未实现，添加以下代码

**主进程**:
```typescript
ipcMain.handle('read-file-buffer', async (event, filePath: string) => {
  const buffer = await fs.readFile(filePath)
  return buffer.buffer
})
```

**Preload**:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('read-file-buffer', filePath)
})
```

---

## 🟡 Batch 3: 标准组件开发

**推荐模型**: `Claude Sonnet 4.5` 或 `Gemini 3 Pro (High)`

---

### T3-1: FileTree 展开/折叠优化

**文件**: `src/components/FileTree.tsx`

**任务描述**:
文件夹点击仅展开/折叠，不切换主视图

**修改**:
```typescript
const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation()
  
  if (node.isDirectory) {
    setExpanded(prev => !prev)
    return  // 仅展开/折叠，不触发 onFileSelect
  }
  
  onFileSelect(node)
}
```

---

### T3-2: Editor 返回按钮

**文件**: `src/components/Editor.tsx`

**任务描述**:
头部添加返回按钮，点击返回文件列表

**修改**:
```tsx
interface EditorProps {
  onBackToList?: () => void
}

// 渲染
{onBackToList && (
  <button className="editor-back-btn" onClick={onBackToList}>
    <ArrowLeft size={16} />
  </button>
)}
```

---

### T3-3: Vite 代码分割配置

**文件**: `vite.config.ts`

**任务描述**:
配置 mammoth.js 独立 chunk

**修改**:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'docx-viewer': ['mammoth']
      }
    }
  }
}
```

**验收**: `npm run build` 后生成独立 `docx-viewer.[hash].js`

---

## 🟢 Batch 4: 样式任务

**推荐模型**: `Gemini 3 Pro (Low)` 或 `GPT-OSS 120B (Medium)`

---

### T4-1: 双栏布局 CSS

**文件**: `src/styles/index.css`

```css
.dual-pane-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-pane, .preview-pane {
  flex: 1;
  overflow: auto;
}

.pane-divider {
  width: 4px;
  background: var(--border-color);
  cursor: col-resize;
}
```

---

### T4-2: FilePropertiesMenu CSS

**新建文件**: `src/components/FilePropertiesMenu.css`

实现弹出菜单样式，与现有 UI 风格一致。

---

### T4-3: 返回按钮 CSS

**文件**: `src/components/Editor.css`

```css
.editor-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.editor-back-btn:hover {
  background: var(--hover-bg);
}
```

---

## 🔵 Batch 5: 国际化翻译

**推荐模型**: `Gemini 3 Flash`

---

### 需添加的键值

```json
{
  "fileProperties": {
    "currentFormat": "当前格式",
    "readOnlyMode": "只读模式",
    "openInSystemApp": "在系统应用中打开",
    "convertFormat": "转换格式"
  },
  "convert": {
    "confirmTitle": "确认转换",
    "lossWarning": "转换为纯文本将丢失所有 Markdown 格式，此操作不可撤销。",
    "confirm": "确认转换"
  },
  "editor": {
    "backToList": "返回列表"
  },
  "viewer": {
    "loading": "加载中...",
    "unsupportedFormat": "不支持的文件格式",
    "openInSystemApp": "在系统应用中打开"
  }
}
```

---

### T5-1 ~ T5-7: 逐语言添加

| 任务 | 文件 | 说明 |
|-----|------|------|
| T5-1 | `src/locales/zh.json` | 中文（参考上方键值） |
| T5-2 | `src/locales/en.json` | 英文翻译 |
| T5-3 | `src/locales/ja.json` | 日文翻译 |
| T5-4 | `src/locales/ko.json` | 韩文翻译 |
| T5-5 | `src/locales/fr.json` | 法文翻译 |
| T5-6 | `src/locales/de.json` | 德文翻译 |
| T5-7 | `src/locales/es.json` | 西班牙文翻译 |

---

## 📎 执行工作流

请参考 `.agent/workflows/multi-model-dispatch.md` 获取分批次执行指令。

---

> **文档版本**: 3.0
> **最后更新**: 2026-01-05
