/**
 * Cloud API Engine (OpenAI 兼容)
 */

export interface CloudConfig {
    apiKey: string;
    baseUrl: string;
    modelName: string;
}

export const DEFAULT_CLOUD_CONFIG: CloudConfig = {
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o'
};

export class OpenAIEngine {
    private config: CloudConfig;
    private abortController: AbortController | null = null;

    constructor(config: CloudConfig) {
        this.config = config;
    }

    updateConfig(config: Partial<CloudConfig>) {
        this.config = { ...this.config, ...config };
    }

    async streamChat(
        messages: Array<{ role: string; content: string }>,
        callbacks: {
            onToken: (token: string) => void;
            onComplete: () => void;
            onError: (error: Error) => void;
        }
    ) {
        if (!this.config.apiKey) {
            callbacks.onError(new Error('API Key 未配置'));
            return;
        }

        this.abortController = new AbortController();
        const baseUrl = this.config.baseUrl.trim().replace(/\/$/, '');

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.modelName,
                    messages,
                    stream: true
                }),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`API 错误: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('无法读取响应');

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

                for (const line of lines) {
                    const data = line.replace('data:', '').trim();
                    if (data === '[DONE]') {
                        callbacks.onComplete();
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content;
                        if (token) callbacks.onToken(token);
                    } catch {
                        // 忽略解析错误
                    }
                }
            }
            callbacks.onComplete();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                callbacks.onComplete();
            } else {
                callbacks.onError(error instanceof Error ? error : new Error(String(error)));
            }
        } finally {
            this.abortController = null;
        }
    }

    /**
     * 非流式聊天完成接口 - 用于 autocomplete 等场景
     * 内部使用流式请求并收集所有 token，避免 CORS 问题
     */
    async chat(
        messages: Array<{ role: string; content: string }>,
        options: { maxTokens?: number; signal?: AbortSignal } = {}
    ): Promise<string> {
        if (!this.config.apiKey) {
            throw new Error('API Key 未配置');
        }

        return new Promise((resolve, reject) => {
            let result = '';
            const originalAbortController = this.abortController;

            // 支持外部 AbortSignal
            if (options.signal) {
                options.signal.addEventListener('abort', () => {
                    this.abort();
                });
            }

            this.streamChat(messages, {
                onToken: (token) => {
                    result += token;
                },
                onComplete: () => {
                    this.abortController = originalAbortController;
                    resolve(result);
                },
                onError: (error) => {
                    this.abortController = originalAbortController;
                    reject(error);
                }
            });
        });
    }

    abort() {
        this.abortController?.abort();
        this.abortController = null;
    }

    async testConnection(): Promise<boolean> {
        if (!this.config.apiKey) return false;

        try {
            const baseUrl = this.config.baseUrl.trim().replace(/\/$/, '');

            // 直接尝试发送一个极简的聊天请求来验证连接
            // 这样可以同时验证 API Key 有效性、BaseUrl 正确性以及 Model 是否可用
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.modelName || 'gpt-4o',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 1 // 限制消耗
                }),
                signal: AbortSignal.timeout(10000)
            });

            return response.ok;
        } catch {
            return false;
        }
    }
}
