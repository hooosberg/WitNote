# Mac App Store 发布准备清单

本文档记录 WitNote 上架 Mac App Store 所需的开发者账号配置和准备工作。

## 1. Apple Developer Program

> **前提条件**: 需要加入 Apple Developer Program ($99/年)

- [ ] 登录 [Apple Developer](https://developer.apple.com/)
- [ ] 确认账号状态为活跃

## 2. 创建 App ID

1. 进入 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. 点击 `+` 创建 Identifier
3. 选择 `App IDs` → `App`
4. 填写:
   - **Description**: WitNote
   - **Bundle ID**: `com.zikedece.witnote` (Explicit)
5. **Capabilities** (功能勾选):
   - **注意**: macOS 应用的 **App Sandbox** 不需要在这里勾选。它是由我们项目中的 `build/entitlements.mas.plist` 文件在本地定义的。
   - 如果您的应用没有使用 iCloud、推送、Apple 登录等特殊功能，**这里可以什么都不勾选**，直接点击 `Continue` 即可。

## 3. 创建证书

### 3.1 Mac App Distribution 证书

用于签名提交到 App Store 的应用。

1. 进入 [Certificates](https://developer.apple.com/account/resources/certificates/list)
2. 点击 `+` 创建证书
3. 选择 `Mac App Distribution`
4. 上传 CSR (Certificate Signing Request)
5. 下载并双击安装到 Keychain

### 3.2 Mac Installer Distribution 证书

用于签名 .pkg 安装包。

1. 重复上述步骤
2. 选择 `Mac Installer Distribution`

## 4. 创建 Provisioning Profile

1. 进入 [Profiles](https://developer.apple.com/account/resources/profiles/list)
2. 点击 `+` 创建 Profile
3. 选择 `Mac App Store` → `Mac App Store Connect`
4. 选择 App ID: `com.zikedece.witnote`
5. 选择证书: `Mac App Distribution`
6. 命名: `WitNote MAS Distribution`
7. 下载 `embedded.provisionprofile`
8. **放置到**: `build/embedded.provisionprofile`

## 5. App Store Connect 配置

1. 登录 [App Store Connect](https://appstoreconnect.apple.com/)
2. 点击 `Apps` → `+` → `New App`
3. 填写:
   - **Platforms**: macOS
   - **Name**: 智简笔记本 (WitNote)
   - **Primary Language**: 简体中文
   - **Bundle ID**: com.zikedece.witnote
   - **SKU**: witnote-mac

## 6. 截图准备 (1280×800 或更大)

- [ ] 主界面截图
- [ ] 编辑器截图
- [ ] AI 对话截图
- [ ] 设置页面截图

## 7. 隐私政策

需要提供可访问的隐私政策 URL。

**要点**:
- 声明应用完全离线运行
- 声明不收集任何用户数据
- 声明 AI 推理在本地进行

## 8. 构建与上传

```bash
# 1. 确保 Provisioning Profile 已放置
cp ~/Downloads/WitNote_MAS_Distribution.mobileprovision build/embedded.provisionprofile

# 2. 构建 MAS 版本
npm run build:mas

# 3. 输出文件
# release/mas/WitNote-x.x.x.pkg

# 4. 使用 Transporter 上传 (从 App Store 下载)
# 或使用命令行:
xcrun altool --upload-app -f release/mas/WitNote-*.pkg -t macos -u YOUR_APPLE_ID
```

## 常见问题

### Q: 证书找不到？

确保证书已安装到 Keychain Access 的 "登录" 钥匙串。

### Q: provisionprofile 错误？

1. 确认 Bundle ID 完全匹配
2. 确认 Profile 类型为 Mac App Store
3. 确认 Profile 未过期

### Q: 代码签名失败？

```bash
# 检查可用的签名身份
security find-identity -v -p codesigning
```
