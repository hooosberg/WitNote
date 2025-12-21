# WitNote DMG 功能测试清单

**构建信息**:
- 版本: 1.2.0
- 文件: `/Users/maohuhu/Desktop/编程项目/智简witnote笔记本/release/WitNote-1.2.0.dmg`
- 大小: 496 MB
- 构建时间: 2025-12-21 11:56

---

## 🚀 安装测试

### 步骤 1: 打开 DMG

```bash
open /Users/maohuhu/Desktop/编程项目/智简witnote笔记本/release/WitNote-1.2.0.dmg
```

- [ ] DMG 正常挂载
- [ ] 显示安装窗口（拖拽到 Applications）

### 步骤 2: 安装应用

- [ ] 拖拽 WitNote.app 到 Applications 文件夹
- [ ] 应用复制成功

### 步骤 3: 首次启动

```bash
open /Applications/WitNote.app
```

- [ ] 应用正常启动（无崩溃）
- [ ] 如果出现"无法打开"提示，右键点击应用选择"打开"

---

## 🧪 核心功能测试

### 1. Ollama 服务启动

**验证方法**:
打开控制台（Console.app）查看日志，或使用以下命令：

```bash
# 查看应用日志
log stream --predicate 'process == "WitNote"' --level debug
```

**预期结果**:
- [ ] 看到 `🤖 准备启动 Ollama...` 日志
- [ ] 看到 `✅ Ollama 启动成功` 日志
- [ ] **重要**: 确认路径为 `process.resourcesPath` (不是 `userData`)

```
路径: /Applications/WitNote.app/Contents/Resources/ollama/mac/ollama
模型目录: /Applications/WitNote.app/Contents/Resources/models/ollama-models
```

### 2. 笔记目录选择

- [ ] 点击"选择笔记目录"或"连接文件夹"
- [ ] 文件选择器正常弹出
- [ ] 选择一个测试目录（如 `~/Documents/test-notes`）
- [ ] 目录路径保存成功

### 3. 文件管理

- [ ] 左侧文件树正常显示
- [ ] 可以创建新文件（.md 或 .txt）
- [ ] 可以创建文件夹
- [ ] 可以重命名文件
- [ ] 可以删除文件
- [ ] 文件内容实时保存

### 4. AI 对话功能

**测试步骤**:
1. 打开或创建一个笔记文件
2. 在右侧 AI 聊天区输入："你好，请介绍一下自己"
3. 点击发送

**预期结果**:
- [ ] AI 返回响应（使用 `qwen2.5:0.5b` 模型）
- [ ] 响应内容合理
- [ ] 聊天记录保存到 `.zennote/chats/` 目录

### 5. 编辑器功能

- [ ] Markdown 实时预览正常
- [ ] 数学公式渲染正常（输入 `$E=mc^2$`）
- [ ] 代码高亮正常
- [ ] 字体大小调整正常
- [ ] 主题切换正常（浅色/深色/茶色）

### 6. 设置页面

- [ ] 可以打开设置页面
- [ ] Ollama 基础 URL 显示 `http://localhost:11434`
- [ ] 可以切换默认文件格式（TXT/MD）
- [ ] 智能格式转换开关正常

---

## ⚠️ MAS 适配验证

### 关键检查点

1. **模型路径验证** (最重要)

打开控制台日志，确认：
```
模型目录: /Applications/WitNote.app/Contents/Resources/models/ollama-models
```

**❌ 如果显示 `userData` 路径，说明 `isMASBuild()` 错误判断了！**

预期：DMG 版本应该使用 `resourcesPath`，MAS 版本才使用 `userData`。

2. **首次模型复制逻辑** (仅 MAS 版本会触发)

DMG 版本**不应该**看到以下日志：
```
📦 MAS 首次运行：复制内置模型到用户目录...
```

---

## 🐛 常见问题排查

### 问题 1: Ollama 启动失败

**症状**: AI 对话无响应
**排查**:
```bash
# 检查 Ollama 是否在运行
curl http://127.0.0.1:11434/api/tags
```

### 问题 2: 模型加载失败

**症状**: AI 返回错误
**排查**:
```bash
# 检查模型文件是否存在
ls -lh /Applications/WitNote.app/Contents/Resources/models/ollama-models/blobs/
```

### 问题 3: 应用闪退

**症状**: 启动后立即关闭
**排查**:
```bash
# 查看崩溃报告
open ~/Library/Logs/DiagnosticReports/
```

---

## ✅ 测试通过标准

所有以下项目必须勾选：
- [ ] 应用正常启动
- [ ] Ollama 服务正常
- [ ] 模型路径使用 `resourcesPath`（不是 `userData`）
- [ ] 文件读写正常
- [ ] AI 对话正常
- [ ] 编辑器功能正常

---

## 📝 测试结果报告

**测试人**: _____________  
**测试日期**: _____________  
**测试结果**: ✅ 通过 / ❌ 失败  

**问题记录**:
```
（如果有问题，请在此记录）
```
