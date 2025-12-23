/**
 * WebLLM Engine - 内置浏览器端 LLM 引擎
 * 使用 @mlc-ai/web-llm 在浏览器中本地运行模型
 */

import { LLMMessage } from '../services/types';

export interface WebLLMProgress {
    progress: number;  // 0-1
    text: string;
}

export class WebLLMEngine {
    private engine: any = null;
    private modelId: string;
    private abortController: AbortController | null = null;
    private _isReady: boolean = false;

    constructor(modelId: string) {
        this.modelId = modelId;
    }

    /**
     * 初始化 WebLLM 引擎
     */
    async initialize(onProgress?: (progress: WebLLMProgress) => void): Promise<void> {
        try {
            // 动态导入 WebLLM 以支持 tree-shaking
            const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

            this.engine = await CreateMLCEngine(this.modelId, {
                initProgressCallback: (report) => {
                    if (onProgress) {
                        onProgress({
                            progress: report.progress,
                            text: report.text
                        });
                    }
                }
            });

            this._isReady = true;
            console.log(`✅ WebLLM 引擎初始化成功: ${this.modelId}`);
        } catch (error) {
            console.error('❌ WebLLM 初始化失败:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this._isReady;
    }

    getModelId(): string {
        return this.modelId;
    }

    /**
     * 流式聊天
     */
    async streamChat(
        messages: LLMMessage[],
        onToken: (token: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void> {
        if (!this.engine) {
            onError(new Error('WebLLM 引擎未初始化'));
            return;
        }

        this.abortController = new AbortController();

        try {
            const response = await this.engine.chat.completions.create({
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                stream: true,
                stream_options: { include_usage: true }
            });

            for await (const chunk of response) {
                if (this.abortController?.signal.aborted) {
                    break;
                }
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                    onToken(delta);
                }
            }

            onComplete();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                onComplete();
            } else {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        } finally {
            this.abortController = null;
        }
    }

    /**
     * 中止生成
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.engine?.interruptGenerate) {
            this.engine.interruptGenerate();
        }
    }

    /**
     * 切换模型
     */
    async switchModel(modelId: string, onProgress?: (progress: WebLLMProgress) => void): Promise<void> {
        this._isReady = false;
        this.modelId = modelId;
        await this.initialize(onProgress);
    }

    /**
     * 卸载引擎
     */
    unload(): void {
        if (this.engine) {
            this.engine = null;
        }
        this._isReady = false;
    }
}

export default WebLLMEngine;
