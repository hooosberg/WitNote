# Windows 版本构建流程

Windows 版本移除了 WebLLM 内置模型支持，只保留 Ollama 外置引擎和云端 API。

## 前置条件

1. 确保 Node.js 和 npm 已安装
2. 确保依赖已安装：`npm install`

## 构建步骤

1. 运行 Windows 构建命令：
```bash
npm run build:win
```

2. 构建产物位于 `release/` 目录：
   - `WitNote-{version}-setup.exe` - NSIS 安装包

## 构建特点

- **WebLLM 相关代码在运行时被禁用** - 通过平台检测自动处理
- **默认引擎设置为 Ollama** - Windows 用户需自行安装 Ollama
- **设置界面不显示 WebLLM 选项** - 只显示「外置引擎」和「云端 API」
- **无 WebGPU 相关命令行参数** - 减少不必要的 GPU 配置

## 技术实现

构建时通过环境变量 `DISABLE_WEBLLM=true` 触发以下行为：

| 文件 | 作用 |
|------|------|
| `vite.config.ts` | 定义 `import.meta.env.DISABLE_WEBLLM` 环境变量 |
| `src/utils/platform.ts` | 提供 `isWebLLMEnabled()` 平台检测函数 |
| `src/store/engineStore.ts` | 默认引擎根据平台自动选择 |
| `src/components/Settings.tsx` | UI 条件渲染：<br>1. 隐藏 WebLLM 选项<br>2. 显示 Ollama 下载链接<br>3. 调整关于页面文案 |
| `src/components/ChatPanel.tsx` | UI 适配：<br>1. 模型列表隐藏 WebLLM<br>2. 空状态显示 Ollama 下载指引 |
| `electron/main.ts` | Windows 平台跳过 WebGPU 参数 |
| `package.json` | NSIS 配置 `perMachine: true` 优化安装路径 |

### 多语言适配 (Localization)

针对 Windows 平台的 UI 修改，必须支持多语言（zh/en 等）。所有文本均不应硬编码。

- **翻译文件位置**：`src/locales/*.json`
- **新增键值**：
    - `settings.windowsOllamaTip`: Windows 推荐提示
    - `settings.downloadOllama`: 下载按钮文本
    - `guide.descriptionWindows`: Windows 版软件描述
    - `guide.philosophySmartDescWindows`: Windows 版理念描述
- **使用示例**：
    ```tsx
    {isWebLLMEnabled() ? t('guide.description') : t('guide.descriptionWindows')}
    ```

## 验证清单

构建完成后，安装并运行应用，确认：

- [ ] 设置页面 AI 引擎选择器只显示「外置引擎」和「云端」
- [ ] 设置页面 Ollama 选项卡显示下载链接 (多语言)
- [ ] 关于页面文案正确显示（不提及内置 WebLLM，多语言）
- [ ] 聊天窗口模型切换列表无 WebLLM
- [ ] 聊天窗口空状态下显示 Ollama 下载提示 (多语言)
- [ ] 安装包默认为全机安装（Program Files），快捷方式指向正确
- [ ] 控制台无 WebLLM 相关错误日志
- [ ] Ollama 连接功能正常
- [ ] 云端 API 配置和测试功能正常

## 与 macOS/Linux 版本的差异

| 功能 | macOS/Linux | Windows |
|------|-------------|---------|
| WebLLM 内置模型 | ✅ 支持 | ❌ 不支持 |
| Ollama 外置引擎 | ✅ 支持 | ✅ 支持 |
| 云端 API | ✅ 支持 | ✅ 支持 |
| 默认引擎 | WebLLM | Ollama |
