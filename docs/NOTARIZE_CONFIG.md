# macOS 签名和公证配置指南

## 概述

本项目使用环境变量来管理 Apple 开发者签名和公证凭证，避免在代码仓库中暴露敏感信息。

## 安全性说明

### 什么信息是敏感的？

❌ **绝对不能提交到 Git 的敏感信息：**
- Apple ID 账号
- Apple ID 密码（App-specific password）
- 私钥文件（.p12, .cer 等）

⚠️ **需要保护的半敏感信息：**
- Team ID（虽然是公开信息，但为了一致性建议也使用环境变量）
- 开发者个人姓名

✅ **可以公开的信息：**
- App ID（com.zikedece.witnote）
- 产品名称（WitNote）

### Team ID 的安全性

**Team ID (如 ***REMOVED***) 本身不是敏感凭证：**
- 它在已发布应用的签名中是公开可见的
- 用户可以通过命令查看：`codesign -dv --verbose=4 /Applications/YourApp.app`
- 仅凭 Team ID 无法进行任何危险操作

**但我们仍然建议使用环境变量管理它：**
- 统一管理所有配置
- 方便切换不同的开发者账号
- 避免在公开文件中暴露个人信息

## 配置步骤

### 1. 创建环境变量配置文件

在项目根目录创建 `.env.notarize` 文件（已被 `.gitignore` 忽略）:

```bash
cp .env.notarize.example .env.notarize
```

### 2. 编辑配置文件

打开 `.env.notarize` 并填入你的真实凭证：

```bash
# Apple 开发者 Team ID
# 查找方式：登录 https://developer.apple.com/account -> Membership Details
APPLE_TEAM_ID=***REMOVED***

# Apple ID（用于公证）
# 使用你的 Apple 开发者账号邮箱
APPLE_ID=your-apple-id@example.com

# App-specific password（应用专用密码）
# 生成方式：https://appleid.apple.com -> Security -> App-Specific Passwords
# 格式：xxxx-xxxx-xxxx-xxxx
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### 3. 查找你的 Team ID

**方法 1：在 Apple 开发者网站查找**
1. 登录 [https://developer.apple.com/account](https://developer.apple.com/account)
2. 进入 "Membership Details"（成员详情）
3. 找到 "Team ID" 字段

**方法 2：通过 Keychain Access 查找**
1. 打开"钥匙串访问"（Keychain Access）
2. 找到你的开发者证书
3. 查看证书详情中的 Organizational Unit (OU) 字段

**方法 3：通过命令行查找**
```bash
security find-identity -v -p codesigning
```

### 4. 生成 App-Specific Password

1. 访问 [https://appleid.apple.com](https://appleid.apple.com)
2. 登录你的 Apple ID
3. 进入 "Security"（安全性）
4. 找到 "App-Specific Passwords"（应用专用密码）
5. 点击 "Generate password..."（生成密码）
6. 输入描述（如 "WitNote Notarization"）
7. 复制生成的密码（格式：xxxx-xxxx-xxxx-xxxx）

## 使用方式

### 本地开发构建

如果已创建 `.env.notarize` 文件，构建时会自动读取：

```bash
npm run build
```

### CI/CD 环境

在 CI/CD 环境（如 GitHub Actions）中，将这些值设置为环境变量：

```yaml
env:
  APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  APPLE_ID: ${{ secrets.APPLE_ID }}
  APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
```

## 工作原理

1. **构建流程**：
   - electron-builder 构建应用
   - 签名应用（使用 Keychain 中的证书）
   - 调用 `scripts/notarize.js` 进行公证

2. **公证脚本** (`scripts/notarize.js`)：
   - 读取 `.env.notarize` 文件或系统环境变量
   - 使用 `@electron/notarize` 提交应用到 Apple 进行公证
   - 等待公证完成并装订票据

3. **配置文件** (`package.json`)：
   - `afterSign` 钩子指向 `scripts/notarize.js`
   - 不再硬编码任何敏感信息

## 验证配置

构建时检查输出日志：

```
📝 公证应用: /path/to/WitNote.app
Team ID: ***REMOVED***
Apple ID: you***@example.com
✅ 公证成功！
```

如果看到警告 "未找到 APPLE_TEAM_ID，跳过公证"，说明环境变量未正确配置。

## 故障排除

### 问题：公证失败，提示 "Invalid credentials"

**解决方案：**
- 确认 Apple ID 和 App-specific password 正确
- 确保使用的是 App-specific password，而不是常规密码
- 检查 Apple ID 是否已加入 Apple Developer Program

### 问题：找不到签名证书

**解决方案：**
- 确保证书已导入到 Keychain
- 运行 `security find-identity -v -p codesigning` 检查
- 确保证书未过期

### 问题：环境变量未生效

**解决方案：**
- 检查 `.env.notarize` 文件是否在项目根目录
- 确认文件格式正确（KEY=VALUE，无引号）
- 尝试重启终端或 IDE

## 安全检查清单

✅ `.env.notarize` 已添加到 `.gitignore`
✅ `.env.notarize.example` 不包含真实凭证
✅ `package.json` 不包含硬编码的 Team ID
✅ 所有工作流文档不包含密码或敏感信息
✅ Git 历史中已清除之前提交的敏感信息（如需要）

## 参考资料

- [Notarizing macOS Software Before Distribution](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [@electron/notarize Documentation](https://github.com/electron/notarize)
- [Using app-specific passwords](https://support.apple.com/en-us/HT204397)
