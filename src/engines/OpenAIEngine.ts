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

    abort() {
        this.abortController?.abort();
        this.abortController = null;
    }

    async testConnection(): Promise<boolean> {
        if (!this.config.apiKey) return false;

        try {
            const baseUrl = this.config.baseUrl.trim().replace(/\/$/, '');
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok && response.status === 404) {
                // 尝试发送最小请求
                const chatRes = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.config.modelName || 'gpt-4o',
                        messages: [{ role: 'user', content: 'test' }],
                        max_tokens: 1
                    }),
                    signal: AbortSignal.timeout(10000)
                });
                return chatRes.ok || chatRes.status === 400;
            }
            return response.ok;
        } catch {
            return false;
        }
    }
}
