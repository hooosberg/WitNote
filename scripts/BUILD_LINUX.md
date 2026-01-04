# Linux 版本构建指南

## 快速构建

```bash
npm run build:linux
```

## 构建命令说明

`build:linux` 脚本会执行以下操作：

1. 设置 `DISABLE_WEBLLM=true` 环境变量（Linux 不支持 WebLLM）
2. TypeScript 编译 (`tsc`)
3. Vite 生产构建 (`vite build`)
4. electron-builder 打包 (`electron-builder --linux`)

## 构建产物

构建完成后，在 `release/` 目录下生成：

### AppImage 格式

| 文件 | 架构 | 说明 |
|------|------|------|
| `WitNote-{version}-x64.AppImage` | x64 | 64位 Intel/AMD 便携版 |
| `WitNote-{version}-arm64.AppImage` | arm64 | ARM64 便携版 |

### Deb 格式

| 文件 | 架构 | 说明 |
|------|------|------|
| `WitNote-{version}-amd64.deb` | x64 | 64位 Debian/Ubuntu 安装包 |
| `WitNote-{version}-arm64.deb` | arm64 | ARM64 Debian/Ubuntu 安装包 |

## Linux 版本特性差异

| 特性 | macOS | Windows | Linux |
|------|-------|---------|-------|
| WebLLM (内置 AI) | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| Ollama | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| 云端 API | ✅ 支持 | ✅ 支持 | ✅ 支持 |

## 安装说明

### AppImage
```bash
chmod +x WitNote-*.AppImage
./WitNote-*.AppImage
```

### Deb (Debian/Ubuntu)
```bash
sudo dpkg -i WitNote-*-amd64.deb
# 或
sudo apt install ./WitNote-*-amd64.deb
```

## 故障排除

### 智能续写返回 404 错误

1. 确保 Ollama 正在运行
2. 打开设置，检查 Ollama 地址配置
3. 建议使用 `127.0.0.1` 而非 `localhost`

### 构建失败

- 检查 TypeScript 编译错误
- 确保 `node_modules` 已正确安装
- 尝试删除 `dist/` 和 `dist-electron/` 后重新构建

### AppImage 无法运行

- 确保已添加执行权限：`chmod +x *.AppImage`
- 安装 FUSE：`sudo apt install libfuse2`

### Deb 依赖问题

运行以下命令修复依赖：
```bash
sudo apt --fix-broken install
```
