#!/bin/bash
# WebLLM 模型下载脚本
# 用于下载 Qwen2.5-0.5B-Instruct-q4f16_1-MLC 模型文件

MODEL_DIR="public/models/Qwen2.5-0.5B-Instruct-q4f16_1-MLC"
BASE_URL="https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC/resolve/main"

mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

echo "📦 开始下载 WebLLM 模型文件..."

# 配置文件
for file in mlc-chat-config.json tokenizer.json tokenizer_config.json ndarray-cache.json; do
  if [ ! -f "$file" ]; then
    echo "下载 $file..."
    curl --retry 5 --connect-timeout 60 -L -O "$BASE_URL/$file"
  else
    echo "✓ $file 已存在"
  fi
done

# 权重文件 (约 400MB)
for i in 0 1 2 3 4 5 6 7; do
  file="params_shard_${i}.bin"
  if [ ! -f "$file" ]; then
    echo "下载 $file..."
    curl --retry 5 --connect-timeout 60 -L -O "$BASE_URL/$file"
  else
    echo "✓ $file 已存在"
  fi
done

echo ""
echo "📊 下载完成，文件列表:"
ls -lh
echo ""
echo "✅ 模型下载完成！"
