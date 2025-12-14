/**
 * LLM 服务类型定义
 * 统一的接口抽象，让 UI 层不需要关心底层是 WebLLM 还是 Ollama
 */

// LLM 提供者类型
export type LLMProviderType = 'webllm' | 'ollama';

// 聊天消息格式
export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// 聊天记录（带 ID）
export interface ChatMessage extends LLMMessage {
    id: string;
    timestamp: number;
    isStreaming?: boolean;
}

// Ollama 模型信息
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
}

// Ollama API 响应
export interface OllamaTagsResponse {
    models: OllamaModel[];
}

// Ollama 聊天响应（流式）
export interface OllamaChatChunk {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

// LLM 状态
export type LLMStatus =
    | 'detecting'     // 正在检测 Ollama
    | 'loading'       // 正在加载模型
    | 'ready'         // 准备就绪
    | 'generating'    // 正在生成
    | 'error';        // 出错

// 模型加载进度
export interface LoadProgress {
    stage: string;
    progress: number;  // 0-100
    text: string;
}

// LLM 提供者接口
export interface LLMProvider {
    type: LLMProviderType;
    modelName: string;

    // 初始化
    initialize(): Promise<void>;

    // 检查状态
    isReady(): boolean;

    // 流式生成
    streamChat(
        messages: LLMMessage[],
        onToken: (token: string) => void,
        onComplete: () => void,
        onError: (error: Error) => void
    ): Promise<void>;

    // 中止生成
    abort(): void;
}

// Web Worker 消息类型
export type WorkerMessageType =
    | 'init'
    | 'chat'
    | 'abort'
    | 'progress'
    | 'token'
    | 'complete'
    | 'error'
    | 'ready';

export interface WorkerMessage {
    type: WorkerMessageType;
    payload?: unknown;
}

// 系统提示词
export const SYSTEM_PROMPT = `你是「禅意笔记本」的 AI 助手。你运行在用户的本地设备上，完全离线工作。
你的任务是帮助用户整理笔记、总结内容、回答问题。
请用简洁、友好的中文回答。`;

// 默认 WebLLM 模型
export const DEFAULT_WEBLLM_MODEL = 'gemma-2-2b-it-q4f32_1-MLC';

// Ollama 默认配置
export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const OLLAMA_DETECT_TIMEOUT = 2000; // 2秒超时
