---
description: 打包发布 Mac 和 Windows 安装包（带签名），并发布到 GitHub Release
---

# WitNote 完整发布流程

## 一、打包前准备

### 1. 清理模型目录（重要！）
// turbo
```bash
rm -f public/models/ollama-models/blobs/*-partial*
```
确保只保留 `qwen2.5:0.5b` 内置模型，模型目录约 **379MB**。

### 2. 更新版本号
修改 `package.json` 中的 `version` 字段。

### 3. 确认签名证书（Mac）
- `identity`: hu Huambo (STWPBZG6S7)
- `teamId`: STWPBZG6S7
- 需要 Apple Developer 账户和已安装的开发者证书

---

## 二、打包应用

### Mac 打包（带签名公证）
// turbo
```bash
npm run build -- --mac
```
**输出**：`release/WitNote-{version}.dmg` (~500MB)

### Windows 打包
// turbo
```bash
npm run build -- --win
```
**输出**：`release/WitNote-{version}-setup.exe` (~900MB)

### 验证打包结果
// turbo
```bash
ls -lh release/WitNote-*.dmg release/WitNote-*-setup.exe
```

---

## 三、安全检查

### 1. 大文件检查
确保没有超过 GitHub 100MB 限制的文件被追踪：
// turbo
```bash
find . -type f -size +100M -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./release/*" -not -path "./dist/*" -not -path "./public/*"
```

### 2. .gitignore 确认
确保以下目录被忽略：
- `release/` - 打包输出
- `public/ollama/` - Ollama 运行时 (~100MB+)
- `public/models/` - 内置模型 (~379MB)
- `*.p12`, `*.cer` 等证书文件

### 3. 隐私文件检查
确保没有敏感文件被追踪：
// turbo
```bash
git status | grep -E "\.(p12|cer|provisionprofile)"
```

---

## 四、文档更新

### 1. 更新 CHANGELOG.md
- 修改 "当前版本" 为新版本号
- 更新 "最后更新" 日期
- 添加版本更新说明

### 2. 检查 README.md / README_zh.md
如有重大功能变更，需同步更新功能列表。

---

## 五、Git 提交

### 1. 提交所有变更
```bash
git add .
git commit -m "release: v{版本号}"
```

### 2. 创建版本 Tag
```bash
git tag v{版本号}
git push origin main --tags
```

---

## 六、GitHub Release

### 1. 创建 Release
访问 https://github.com/hooosberg/WitNote/releases/new

### 2. 填写信息
- **Tag**: 选择刚创建的 `v{版本号}`
- **Title**: `WitNote v{版本号}`
- **Description**: 参考下方模板

### 3. 上传安装包
- `WitNote-{version}.dmg` (Mac)
- `WitNote-{version}-setup.exe` (Windows)

### 4. Release Notes 模板
```markdown
## 🎉 新功能
- ...

## 🐛 Bug 修复
- ...

## 📦 下载
| 平台 | 文件 | 大小 |
|------|------|------|
| macOS | WitNote-{version}.dmg | ~500MB |
| Windows | WitNote-{version}-setup.exe | ~900MB |

## ⚠️ 说明
- 首次启动需要少许时间加载内置 AI 模型
- 如需更强大的 AI 能力，可在设置中下载更多模型
```

---

## 注意事项

1. **控制体积**：打包前必须清理 `*-partial*` 文件
2. **Mac 签名**：需要在 macOS 上打包，且已安装 Apple Developer 证书
3. **Windows 交叉编译**：可以在 macOS 上打包 Windows 版本
4. **公证等待**：Mac 公证可能需要几分钟时间
