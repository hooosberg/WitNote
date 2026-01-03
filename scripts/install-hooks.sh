#!/bin/bash
# 安装 Git Pre-commit Hook

HOOK_FILE=".git/hooks/pre-commit"

echo "正在安装 pre-commit hook..."

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit security check..."
./scripts/check-security.sh
if [ $? -ne 0 ]; then
    echo "❌ Security check failed. Commit aborted."
    exit 1
fi
EOF

chmod +x "$HOOK_FILE"
echo "✅ Hook installed to $HOOK_FILE"
