#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# WitNote macOS DMG 构建脚本
# 用途: 构建签名并公证的 DMG 发布版本
# ═══════════════════════════════════════════════════════════════════════════

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       WitNote macOS DMG 构建工具                              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# 加载环境变量
echo -e "\n${YELLOW}[Step 1] 加载环境变量...${NC}"
if [ -f ".env.local" ]; then
    source .env.local
    echo -e "✅ 已加载 .env.local"
elif [ -f ".env" ]; then
    source .env
    echo -e "✅ 已加载 .env"
else
    echo -e "${YELLOW}⚠️ 未找到 .env 文件，使用系统环境变量${NC}"
fi

# 检查 Apple 凭据
echo -e "\n${YELLOW}[Step 2] 验证 Apple 凭据...${NC}"
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
    echo -e "${RED}❌ 错误: 未配置 Apple 凭据${NC}"
    echo -e "请在 .env.local 或环境变量中设置:"
    echo -e "  - APPLE_ID"
    echo -e "  - APPLE_APP_SPECIFIC_PASSWORD"
    echo -e "  - APPLE_TEAM_ID"
    exit 1
fi

# 获取版本号
VERSION=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "📦 当前版本: ${GREEN}$VERSION${NC}"
echo -e "🍎 Apple ID: ${GREEN}$APPLE_ID${NC}"
echo -e "🔐 Team ID: ${GREEN}$APPLE_TEAM_ID${NC}"
echo -e "✅ 凭据验证通过"

# 导出环境变量供 electron-builder 使用
export APPLE_ID
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID

# 清理旧构建
echo -e "\n${YELLOW}[Step 3] 清理旧构建...${NC}"
rm -rf release/*.dmg 2>/dev/null || true
echo -e "✅ 清理完成"

# 运行构建
echo -e "\n${YELLOW}[Step 4] 构建 DMG 版本...${NC}"
echo -e "执行: npm run build"
npm run build

# 完成
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ macOS DMG 构建完成！${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "\n📦 输出目录: ${BLUE}release/${NC}"
echo -e "\n生成的文件:"
ls -la release/*.dmg 2>/dev/null || echo "  (请检查 release/ 目录)"
echo ""
