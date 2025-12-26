# 版本发布流程 (Release Workflow)

本文档记录了 WitNote 版本的发布流程，包括构建、检查和上传步骤。

## 1. 版本准备
- 确保 `package.json` 中的 `version` 字段已更新。
- 更新 `CHANGELOG.md` 记录新版本的变更。

## 2. 安全与文件检查
在构建和上传之前，运行以下检查：
- **检查大文件**：确保没有超过 100MB 的非必要文件（如 PSD 设计稿等）。
  ```bash
  find . -type f -size +50M -not -path "*/node_modules/*"
  ```
- **安全检查清单**：务必按照 [Security Checklist](SECURITY_CHECKLIST.md) 进行全面检查，确保无敏感信息泄露！
  ```bash
  # 检查文档和代码中的敏感词
  grep -rE "password|secret|key|token" src/ docs/
  ```


## 3. Git 同步与标签
1. 提交所有更改：
   ```bash
   git add .
   git commit -m "chore: release v1.2.4"
   ```
2. 打标签：
   ```bash
   git tag v1.2.4
   ```
3. 推送到 GitHub：
   ```bash
   git push origin main --tags
   ```

## 4.终端 GitHub Release 上传

3. 选择标签 `v1.2.4`。
4. 填写标题 (例如 "WitNote v1.2.4")。
5. 编写版本简介 。
6. 上传构建产物：
   - `release/WitNote-1.2.4.dmg`
   - `release/WitNote-1.2.4-setup.exe` 
