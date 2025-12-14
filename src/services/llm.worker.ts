/**
 * WebLLM Web Worker
 * 在独立线程中运行 WebLLM 引擎，避免阻塞主线程
 */

import * as webllm from '@mlc-ai/web-llm';
import { WorkerMessage, SYSTEM_PROMPT, DEFAULT_WEBLLM_MODEL, LLMMessage } from './types';

let engine: webllm.MLCEngine | null = null;

// 发送消息到主线程
function postMessage(message: WorkerMessage) {
    self.postMessage(message);
}

// 初始化引擎
async function initEngine(modelId: string) {
    try {
        console.log(`🔄 Worker: 开始加载模型 ${modelId}`);

        engine = new webllm.MLCEngine();

        await engine.reload(modelId, {
            // 进度回调
            initProgressCallback: (progress) => {
                postMessage({
                    type: 'progress',
                    payload: {
                        stage: progress.text,
                        progress: Math.round(progress.progress * 100),
                        text: progress.text
                    }
                });
            }
        });

        console.log('✅ Worker: 模型加载完成');
        postMessage({ type: 'ready' });
    } catch (error) {
        console.error('❌ Worker: 模型加载失败:', error);
        postMessage({
            type: 'error',
            payload: error instanceof Error ? error.message : '未知错误'
        });
    }
}

// 流式聊天
async function streamChat(messages: LLMMessage[]) {
    if (!engine) {
        postMessage({
            type: 'error',
            payload: '引擎未初始化'
        });
        return;
    }

    try {
        // 添加系统提示词
        const fullMessages: webllm.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map(m => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content
            }))
        ];

        const asyncChunkGenerator = await engine.chat.completions.create({
            messages: fullMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024
        });

        for await (const chunk of asyncChunkGenerator) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                postMessage({
                    type: 'token',
                    payload: delta
                });
            }
        }

        postMessage({ type: 'complete' });
    } catch (error) {
        console.error('❌ Worker: 生成失败:', error);
        postMessage({
            type: 'error',
            payload: error instanceof Error ? error.message : '生成失败'
        });
    }
}

// 中止生成
function abortGeneration() {
    if (engine) {
        engine.interruptGenerate();
        console.log('🛑 Worker: 生成已中止');
    }
}

// 监听主线程消息
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'init':
            const modelId = (payload as { modelId: string })?.modelId || DEFAULT_WEBLLM_MODEL;
            await initEngine(modelId);
            break;

        case 'chat':
            const messages = payload as LLMMessage[];
            await streamChat(messages);
            break;

        case 'abort':
            abortGeneration();
            break;

        default:
            console.warn('Worker: 未知消息类型:', type);
    }
};

console.log('🧵 WebLLM Worker 已启动');
