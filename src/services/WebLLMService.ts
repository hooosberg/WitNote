/**
 * WebLLM 服务
 * 通过 Web Worker 与 WebLLM 引擎通信
 */

import {
    LLMProvider,
    LLMMessage,
    WorkerMessage,
    LoadProgress,
    DEFAULT_WEBLLM_MODEL
} from './types';

export class WebLLMService implements LLMProvider {
    readonly type = 'webllm' as const;
    modelName: string;

    private worker: Worker | null = null;
    private _isReady: boolean = false;
    private onProgressCallback: ((progress: LoadProgress) => void) | null = null;

    // 用于处理流式响应的回调
    private currentOnToken: ((token: string) => void) | null = null;
    private currentOnComplete: (() => void) | null = null;
    private currentOnError: ((error: Error) => void) | null = null;

    constructor(modelName: string = DEFAULT_WEBLLM_MODEL) {
        this.modelName = modelName;
    }

    /**
     * 设置加载进度回调
     */
    setProgressCallback(callback: (progress: LoadProgress) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * 初始化服务
     */
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            // 创建 Web Worker
            this.worker = new Worker(
                new URL('./llm.worker.ts', import.meta.url),
                { type: 'module' }
            );

            // 监听 Worker 消息
            this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
                this.handleWorkerMessage(event.data, resolve, reject);
            };

            this.worker.onerror = (error) => {
                console.error('❌ Worker 错误:', error);
                reject(new Error('Worker 初始化失败'));
            };

            // 发送初始化命令
            this.worker.postMessage({
                type: 'init',
                payload: { modelId: this.modelName }
            } as WorkerMessage);
        });
    }

    /**
     * 处理 Worker 消息
     */
    private handleWorkerMessage(
        message: WorkerMessage,
        initResolve?: (value: void) => void,
        initReject?: (reason: Error) => void
    ): void {
        switch (message.type) {
            case 'progress':
                const progress = message.payload as LoadProgress;
                if (this.onProgressCallback) {
                    this.onProgressCallback(progress);
                }
                break;

            case 'ready':
                this._isReady = true;
                console.log('🔵 WebLLM 服务就绪');
                if (initResolve) initResolve();
                break;

            case 'token':
                const token = message.payload as string;
                if (this.currentOnToken) {
                    this.currentOnToken(token);
                }
                break;

            case 'complete':
                if (this.currentOnComplete) {
                    this.currentOnComplete();
                }
                this.clearCallbacks();
                break;

            case 'error':
                const errorMessage = message.payload as string;
                const error = new Error(errorMessage);

                if (initReject) {
                    initReject(error);
                } else if (this.currentOnError) {
                    this.currentOnError(error);
                }
                this.clearCallbacks();
                break;
        }
    }

    /**
     * 清除回调
     */
    private clearCallbacks(): void {
        this.currentOnToken = null;
        this.currentOnComplete = null;
        this.currentOnError = null;
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
        if (!this.worker || !this._isReady) {
            onError(new Error('WebLLM 服务未就绪'));
            return;
        }

        // 设置回调（覆盖初始化时的处理器）
        this.currentOnToken = onToken;
        this.currentOnComplete = onComplete;
        this.currentOnError = onError;

        // 重新设置消息处理器
        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            this.handleWorkerMessage(event.data);
        };

        // 发送聊天请求
        this.worker.postMessage({
            type: 'chat',
            payload: messages
        } as WorkerMessage);
    }

    /**
     * 中止生成
     */
    abort(): void {
        if (this.worker) {
            this.worker.postMessage({ type: 'abort' } as WorkerMessage);
        }
    }

    /**
     * 销毁服务
     */
    destroy(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this._isReady = false;
    }
}

export default WebLLMService;
