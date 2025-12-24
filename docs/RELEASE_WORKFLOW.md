# 版本发布流程 (Release Workflow)

本文档记录了 WitNote 版本的发布流程，包括构建、检查和上传步骤。

## 1. 版本准备
- 确保 `package.json` 中的 `version` 字段已更新 (例如 1.2.3)。
- 更新 `CHANGELOG.md` 记录新版本的变更。

## 2. 安全与文件检查
在构建和上传之前，运行以下检查：
- **检查大文件**：确保没有超过 100MB 的非必要文件（如 PSD 设计稿等）。
  ```bash
  find . -type f -size +50M -not -path "*/node_modules/*"
  ```
- **敏感信息检查**：确保没有硬编码的密钥或密码。
  ```bash
  grep -rE "(password|secret|key|token).{0,20}=" src/
  ```

## 3. 构建应用
### macOS (DMG)
构建并公证 macOS应用 (需要设置环境变量 `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`):
```bash
npm run build
# 或者专门构建 DMG
npm run build:mas 
# 注意：package.json 配置中的 build 脚本通常包含 DMG 构建
```

### Windows (EXE)
构建 Windows 安装包 (在 macOS 上可能需要 Wine，建议在 Windows 环境或 CI/CD 中运行):
```bash
npm run build:win
```

## 4. Git 同步与标签
1. 提交所有更改：
   ```bash
   git add .
   git commit -m "chore: release v1.2.3"
   ```
2. 打标签：
   ```bash
   git tag v1.2.3
   ```
3. 推送到 GitHub：
   ```bash
   git push origin main --tags
   ```

## 5. GitHub Release 上传
1. 访问 GitHub 仓库的 Releases 页面。
2. 点击 "Draft a new release"。
3. 选择标签 `v1.2.3`。
4. 填写标题 (例如 "WitNote v1.2.3")。
5. 粘贴版本简介 (Release Notes)。
6. 上传构建产物：
   - `release/WitNote-1.2.3.dmg`
   - `release/WitNote-Setup-1.2.3.exe` (如果有)
   - `release/WitNote-1.2.3-arm64.dmg` (根据架构)
7. 点击 "Publish release"。
