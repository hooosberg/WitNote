#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# 安全检查脚本
# 用途: 扫描代码库中的潜在敏感信息，防止密钥泄露
# ═══════════════════════════════════════════════════════════════════════════

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 开始安全扫描...${NC}"

# 1. 检查环境变量文件是否被 Git 追踪
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo -e "${RED}❌ 严重错误: .env 文件被 Git 追踪！${NC}"
    echo -e "请立即运行: git rm --cached .env"
    FAILURE=1
fi

if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
    echo -e "${RED}❌ 严重错误: .env.local 文件被 Git 追踪！${NC}"
    echo -e "请立即运行: git rm --cached .env.local"
    FAILURE=1
fi

# 2. 扫描文件内容中的敏感关键词
# 排除 .env.example, .gitignore, 和本脚本
# 关键词: AWS_KEY, API_KEY (部分), PRIVATE KEY, password (部分上下文)

echo -e "正在扫描文件内容..."

KEYWORDS=("***REMOVED***" "-----BEGIN PRIVATE KEY-----" "ghp_" "sk_live_")

# 查找包含敏感关键词的文件（排除 build, dist, node_modules, .git 等）
# 注意：我们使用 grep 递归搜索
FOUND_SENSITIVE=0

for KEYWORD in "${KEYWORDS[@]}"; do
    if grep -r --exclude-dir={node_modules,dist,dist-electron,release,.git,.gemini} --exclude={check-security.sh,.env,.env.local,.env.notarize,.env.notarize.example} -- "$KEYWORD" .; then
        echo -e "${RED}❌ 发现潜在敏感信息: $KEYWORD${NC}"
        FOUND_SENSITIVE=1
    fi
done

# 特别检查 Apple ID 密码格式 (xxxx-xxxx-xxxx-xxxx)
if grep -r --exclude-dir={node_modules,dist,dist-electron,release,.git,.gemini} --exclude={check-security.sh,.env,.env.local,.env.notarize,.env.notarize.example} -E "[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}" . | grep "APPLE" | grep -v "xxxx-xxxx-xxxx-xxxx"; then
    echo -e "${RED}❌ 发现疑似 Apple App-Specific Password${NC}"
    FOUND_SENSITIVE=1
fi

if [ "$FOUND_SENSITIVE" -eq 1 ] || [ "$FAILURE" -eq 1 ]; then
    echo -e "\n${RED}🚫 安全检查失败！请清理上述敏感信息后再提交。${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ 安全检查通过。${NC}"
fi
