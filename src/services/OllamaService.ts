/**
 * Ollama HTTP 客户端服务
 * 通过 HTTP API 与本地 Ollama 服务通信
 */

import {
    LLMProvider,
    LLMMessage,
    OllamaModel,
    OllamaTagsResponse,
    OllamaChatChunk,
    OLLAMA_BASE_URL,
    OLLAMA_DETECT_TIMEOUT,
    SYSTEM_PROMPT
} from './types';

export class OllamaService implements LLMProvider {
    readonly type = 'ollama' as const;
    modelName: string;

    private baseUrl: string;
    private abortController: AbortController | null = null;
    private _isReady: boolean = false;

    constructor(modelName: string = '', baseUrl: string = OLLAMA_BASE_URL) {
        this.modelName = modelName;
        this.baseUrl = baseUrl;
    }

    /**
     * 探测 Ollama 服务是否在线
     * 返回可用模型列表，如果离线则返回 null
     */
    static async detect(): Promise<OllamaModel[] | null> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), OLLAMA_DETECT_TIMEOUT);

            const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                console.warn('⚠️ Ollama 返回非 OK 状态:', response.status);
                return null;
            }

            const data: OllamaTagsResponse = await response.json();
            console.log('✅ Ollama 检测成功，发现模型:', data.models?.map(m => m.name));

            return data.models || [];
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('⚠️ Ollama 探测超时');
            } else {
                console.log('⚠️ Ollama 未检测到:', error);
            }
            return null;
        }
    }

    /**
     * 初始化服务
     */
    async initialize(): Promise<void> {
        if (!this.modelName) {
            throw new Error('Ollama 服务需要指定模型名称');
        }

        // 验证模型是否存在
        const models = await OllamaService.detect();
        if (!models) {
            throw new Error('无法连接到 Ollama 服务');
        }

        const modelExists = models.some(m => m.name === this.modelName);
        if (!modelExists) {
            console.warn(`⚠️ 模型 ${this.modelName} 不在列表中，尝试使用第一个可用模型`);
            if (models.length > 0) {
                this.modelName = models[0].name;
            } else {
                throw new Error('Ollama 没有可用的模型');
            }
        }

        this._isReady = true;
        console.log(`🟢 Ollama 服务就绪，使用模型: ${this.modelName}`);
    }

    isReady(): boolean {
        return this._isReady;
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
        this.abortController = new AbortController();

        // 添加系统提示词
        const fullMessages: LLMMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: fullMessages,
                    stream: true
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`Ollama API 错误: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('响应体为空');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                // Ollama 返回的是按行分隔的 JSON
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const json: OllamaChatChunk = JSON.parse(line);

                        if (json.message?.content) {
                            onToken(json.message.content);
                        }

                        if (json.done) {
                            onComplete();
                            return;
                        }
                    } catch (parseError) {
                        // 忽略解析错误（可能是不完整的 JSON）
                        console.warn('JSON 解析警告:', parseError);
                    }
                }
            }

            onComplete();
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.log('🛑 生成已中止');
                    onComplete();
                } else {
                    console.error('❌ Ollama 流式响应错误:', error);
                    onError(error);
                }
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
    }

    /**
     * 切换模型
     */
    setModel(modelName: string): void {
        this.modelName = modelName;
        console.log(`🔄 切换 Ollama 模型为: ${modelName}`);
    }
}

export default OllamaService;
