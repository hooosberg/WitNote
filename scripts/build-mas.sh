#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# WitNote Mac App Store (MAS) 构建脚本
# ═══════════════════════════════════════════════════════════════════════════

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APPLE_ID="***REMOVED***"
APPLE_TEAM_ID="***REMOVED***"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       WitNote Mac App Store 构建工具                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: 前置检查
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 1] 前置条件检查...${NC}"

# 检查版本号
VERSION=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "📦 当前版本: ${GREEN}$VERSION${NC}"

# 检查 provisioning profile
if [ ! -f "build/embedded.provisionprofile" ]; then
    echo -e "${RED}❌ 错误: build/embedded.provisionprofile 不存在${NC}"
    echo -e "请从 Apple Developer Portal 下载并放置到 build/ 目录"
    exit 1
fi
echo -e "✅ Provisioning Profile 已找到"

# 检查 entitlements
if [ ! -f "build/entitlements.mas.plist" ]; then
    echo -e "${RED}❌ 错误: build/entitlements.mas.plist 不存在${NC}"
    exit 1
fi
echo -e "✅ Entitlements 文件已找到"

# 检查证书
if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
    echo -e "${RED}❌ 错误: 未找到 Apple Distribution 证书${NC}"
    echo -e "请确保证书已安装到钥匙串"
    exit 1
fi
echo -e "✅ Apple Distribution 证书已找到"

if ! security find-identity -v | grep -q "Mac Developer Installer\|3rd Party Mac Developer Installer"; then
    echo -e "${YELLOW}⚠️ 警告: 未找到 Mac Developer Installer 证书${NC}"
    echo -e "PKG 签名可能会失败"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: 清理旧构建
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 2] 清理旧构建...${NC}"
rm -rf release/mas dist dist-electron
echo -e "✅ 清理完成"

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: 构建 MAS
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 3] 构建 MAS 版本...${NC}"
# 允许 electron-builder 失败（PKG 签名可能失败，但 APP 会被创建）
npm run build:mas || true

# ═══════════════════════════════════════════════════════════════════════════
# Step 4: 定位输出文件并手动创建 PKG（如需要）
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 4] 定位输出文件...${NC}"

APP_PATH=$(find release -name "*.app" -type d 2>/dev/null | head -1)
PKG_PATH=$(find release -name "*.pkg" -type f 2>/dev/null | head -1)

# 检查 APP 是否存在
if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ 未找到 APP 文件${NC}"
    echo "release/ 目录内容:"
    ls -la release/
    exit 1
fi
echo -e "📱 APP: ${GREEN}$APP_PATH${NC}"

# 如果 PKG 不存在，手动创建
if [ -z "$PKG_PATH" ]; then
    echo -e "${YELLOW}⚠️ PKG 未由 electron-builder 创建，使用 productbuild 手动创建...${NC}"
    PKG_PATH="release/WitNote-${VERSION}-mas.pkg"
    
    echo -e "正在创建 PKG..."
    if productbuild --component "$APP_PATH" /Applications --sign "3rd Party Mac Developer Installer: ***REMOVED*** (***REMOVED***)" "$PKG_PATH"; then
        echo -e "✅ PKG 创建成功"
    else
        echo -e "${RED}❌ PKG 创建失败${NC}"
        exit 1
    fi
fi

echo -e "📦 PKG: ${GREEN}$PKG_PATH${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# Step 5: 签名验证
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 5] 签名验证...${NC}"

if [ -n "$APP_PATH" ]; then
    echo -e "\n📋 验证应用签名..."
    if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
        echo -e "✅ 应用签名有效"
    else
        echo -e "${RED}❌ 应用签名验证失败${NC}"
    fi
fi

echo -e "\n📋 验证 PKG 签名..."
if pkgutil --check-signature "$PKG_PATH" 2>&1; then
    echo -e "✅ PKG 签名有效"
else
    echo -e "${YELLOW}⚠️ PKG 签名验证警告${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 6: 合规性检查
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${YELLOW}[Step 6] MAS 合规性检查...${NC}"

if [ -n "$APP_PATH" ]; then
    # 检查 App Sandbox
    SANDBOX_CHECK=$(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | grep "app-sandbox" | grep -c "true" || echo "0")
    if [ "$SANDBOX_CHECK" -gt 0 ]; then
        echo -e "✅ App Sandbox 已启用"
    else
        echo -e "${RED}❌ App Sandbox 未启用 - MAS 要求必须启用${NC}"
    fi

    # 检查 entitlements
    echo -e "\n📋 Entitlements 检查:"
    codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | grep -E "(app-sandbox|network|files)" | head -10
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 7: 完成
# ═══════════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ MAS 构建完成！${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "\n📦 输出文件: ${BLUE}$PKG_PATH${NC}"
echo -e "\n下一步操作:"
echo -e "  1. 使用 Transporter 上传到 App Store Connect"
echo -e "  2. 或运行: xcrun altool --upload-app -f \"$PKG_PATH\" -t macos -u \"$APPLE_ID\""
echo ""
