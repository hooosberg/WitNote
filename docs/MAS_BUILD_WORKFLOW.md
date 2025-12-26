# Mac App Store (MAS) 构建完整流程

本文档记录 WitNote 打包为 Mac App Store 格式的完整流程，包括前置检查、构建、验证和提交。

---

## 🚀 快速构建命令

```bash
# 完整构建流程
npm run build:mas
```

---

## 📋 前置条件检查清单

### 1. 开发者证书

```bash
security find-identity -v -p codesigning
```

**需要以下证书**:
| 证书 | 用途 |
|------|------|
| `Apple Distribution: ***REMOVED*** (***REMOVED***)` | 签名应用 (.app) |
| `3rd Party Mac Developer Installer: ***REMOVED*** (***REMOVED***)` | 签名安装包 (.pkg) |

### 2. Provisioning Profile

```bash
ls -la build/embedded.provisionprofile
```

> [!IMPORTANT]
> 文件必须存在。如缺失，从 [Apple Developer Portal](https://developer.apple.com/account/resources/profiles/list) 下载。

### 3. Entitlements 配置

**entitlements.mas.plist 权限清单**:
| 权限 | 用途 |
|------|------|
| `com.apple.security.app-sandbox` | MAS 强制沙盒 |
| `com.apple.security.network.client` | 网络请求（Ollama/Cloud API） |
| `com.apple.security.files.user-selected.read-write` | 用户选择的文件夹 |
| `com.apple.security.files.bookmarks.app-scope` | 持久化文件夹访问权限 |

---

## 🔨 构建步骤

### Step 1: 更新版本号

```bash
# 查看当前版本
grep '"version":' package.json

# 编辑 package.json 更新版本号（确保与已提交版本不重复）
```

> [!CAUTION]
> **已撤销的版本号无法重复使用！** 如 1.2.3 已撤销，必须使用 1.2.4。

### Step 2: 清理旧构建

```bash
rm -rf release/mas* dist dist-electron
```

### Step 3: 执行构建

```bash
npm run build:mas
```

构建过程:
1. `tsc` - 编译 TypeScript
2. `vite build` - 打包前端资源
3. `electron-builder --mac mas` - 构建 MAS 包

### Step 4: 验证输出

```bash
ls -la release/*.pkg
```

输出文件: `release/WitNote-X.X.X-arm64.pkg`

---

## ✅ 签名验证

### 验证应用签名

```bash
codesign --verify --deep --strict --verbose=2 release/mas-arm64/WitNote.app
```

### 验证 PKG 签名

```bash
pkgutil --check-signature release/WitNote-*.pkg
```

### 验证 Entitlements

```bash
codesign -d --entitlements :- release/mas-arm64/WitNote.app
```

### MAS 合规性验证

```bash
spctl --assess --type install -v release/WitNote-*.pkg
```

预期输出: `accepted`

---

## 🛡️ MAS 合规性要点

### 已处理的合规项

| 项目 | 处理方式 |
|------|----------|
| **App Sandbox** | entitlements.mas.plist 中启用 |
| **子进程调用** | MAS 环境下禁用 spawn（isMAS 检测） |
| **文件夹权限持久化** | Security-Scoped Bookmarks |
| **网络权限** | 仅客户端权限，无服务器权限 |

### MAS 环境特殊行为

- ❌ Ollama 命令行功能不可用（spawn 被禁用）
- ✅ Ollama HTTP API 仍可用（用户需自行运行 Ollama）
- ✅ WebLLM 完全可用（内置浏览器端 AI）
- ✅ Cloud API 完全可用（用户配置）

---

## 📤 上传到 App Store Connect

### 方式一: Transporter（推荐）

1. 从 Mac App Store 下载 **Transporter**
2. 登录 Apple Developer 账号
3. 拖入 `.pkg` 文件
4. 点击"交付"

### 方式二: 命令行

```bash
xcrun altool --upload-app \
  -f "release/WitNote-1.2.4-arm64.pkg" \
  -t macos \
  -u "***REMOVED***"
```

> 提示输入 App-specific password: `<your-app-specific-password>`

---

## 🚨 常见问题

### Q: 版本号冲突？
**A**: 已撤销的版本号不可复用。递增版本号（如 1.2.3 → 1.2.4）。

### Q: 证书找不到？
```bash
security find-identity -v -p codesigning | grep "Apple Distribution"
```

### Q: 重启后文件夹无法加载？
**A**: 需要 Security-Scoped Bookmarks。已在 1.2.4 中修复。

### Q: Ollama 功能不可用？
**A**: MAS 沙盒限制。用户需：
1. 使用 WebLLM（内置）
2. 或安装 Ollama 后通过 HTTP API 连接

---

## ⚡ 一键构建脚本

```bash
#!/bin/bash
# scripts/build-mas-full.sh

set -e

echo "🔨 构建 MAS 版本..."

# 清理
rm -rf release/mas* dist dist-electron

# 构建
npm run build:mas

# 验证
echo "✅ 验证签名..."
codesign --verify --deep --strict release/mas-arm64/WitNote.app

echo "✅ 验证 PKG..."
pkgutil --check-signature release/WitNote-*.pkg

echo "🎉 构建完成！"
ls -la release/*.pkg
```

---

## 📝 1.2.4 版本更新内容

- 🔧 修复：MAS 版本重启后文件夹无法加载的问题
- 🛡️ 新增：Security-Scoped Bookmarks 持久化文件夹访问权限
