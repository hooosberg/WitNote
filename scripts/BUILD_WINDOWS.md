# Windows 版本构建指南

## 快速构建

### 构建混合安装包（包含 x64 + arm64）

```bash
npm run build:win
```

### 分别构建独立架构版本（推荐）

**步骤 1：编译项目**
```bash
DISABLE_WEBLLM=true npx tsc && DISABLE_WEBLLM=true npx vite build
```

**步骤 2a：构建 x64 版本（Intel/AMD 64位）**
```bash
npx electron-builder --win nsis:x64 -c.win.target='[{"target":"nsis","arch":["x64"]}]'
```

**步骤 2b：构建 ARM64 版本**
```bash
npx electron-builder --win nsis --arm64 --config.win.target=null
```

> 💡 分别构建可以为用户提供更小的安装包，避免下载不需要的架构文件。

## 构建命令说明

`build:win` 脚本会执行以下操作：

1. 设置 `DISABLE_WEBLLM=true` 环境变量（Windows 不支持 WebLLM）
2. TypeScript 编译 (`tsc`)
3. Vite 生产构建 (`vite build`)
4. electron-builder 打包 (`electron-builder --win`)

## 构建产物

构建完成后，在 `release/` 目录下生成：

### 独立架构安装包（分别构建时生成）

| 文件 | 架构 | 大小 | 说明 |
|------|------|------|------|
| `WitNote-{version}-setup-x64.exe` | x64 | ~82MB | 64位 Intel/AMD 安装包 |
| `WitNote-{version}-setup-arm64.exe` | arm64 | ~84MB | ARM64 安装包（Surface Pro X 等） |

### 混合安装包（快速构建时生成）

| 文件 | 架构 | 说明 |
|------|------|------|
| `WitNote-{version}-setup.exe` | x64 + arm64 | 通用安装包（体积较大，~160MB） |

## Windows 版本特性差异

| 特性 | macOS | Windows |
|------|-------|---------|
| WebLLM (内置 AI) | ✅ 支持 | ❌ 不支持 |
| Ollama | ✅ 支持 | ✅ 支持 |
| 云端 API | ✅ 支持 | ✅ 支持 |

## 故障排除

### 智能续写返回 404 错误

1. 确保 Ollama 正在运行
2. 打开设置，检查 Ollama 地址配置
3. 建议使用 `127.0.0.1` 而非 `localhost`

### 构建失败

- 检查 TypeScript 编译错误
- 确保 `node_modules` 已正确安装
- 尝试删除 `dist/` 和 `dist-electron/` 后重新构建
