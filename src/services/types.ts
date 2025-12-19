/**
 * LLM 服务类型定义
 * Ollama-only 架构
 */

// LLM 提供者类型（仅Ollama）
export type LLMProviderType = 'ollama';

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

// Ollama 模型详情
export interface OllamaModelDetails {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
}

// Ollama 模型信息
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    details?: OllamaModelDetails;
    formattedSize?: string; // 用于显示的人类可读大小
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

// 系统提示词 - 中文版
export const SYSTEM_PROMPT_ZH = `你是「智简笔记本 WitNote」的写作助手，运行在用户本地设备上。

【核心原则】
- 回答时优先使用下方提供的文件信息和搜索结果
- 如果搜索到相关文件，直接告诉用户找到了哪些文件
- 回答简洁精炼，使用自然流畅的中文

【你的能力】
- 帮用户在笔记库中搜索和查找文件
- 帮助用户润色、修改、续写文章
- 总结内容、提取要点
- 提供写作建议和灵感

【回答风格】
- 不要重复用户的问题
- 直接给出有价值的回答
- 保持友好但专业的语气`;

// 系统提示词 - 英文版
export const SYSTEM_PROMPT_EN = `You are the writing assistant for "WitNote", running locally on the user's device.

【Core Principles】
- Prioritize information from files and search results provided below
- If relevant files are found, tell the user which files were found
- Keep responses concise and clear

【Your Capabilities】
- Search and find files in the user's note library
- Help polish, edit, and continue writing articles
- Summarize content and extract key points
- Provide writing suggestions and inspiration

【Response Style】
- Don't repeat the user's question
- Provide valuable answers directly
- Maintain a friendly but professional tone`;

// 默认导出中文版（向后兼容）
export const SYSTEM_PROMPT = SYSTEM_PROMPT_ZH;

// 根据语言获取系统提示词
export function getDefaultSystemPrompt(lang: string): string {
    return lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
}

// Ollama 默认配置
export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const OLLAMA_DETECT_TIMEOUT = 3000; // 3秒超时

// 推荐模型列表（按体积从小到大排序）
export interface RecommendedModel {
    name: string;
    description: string;
    taglineKey: string;  // 翻译键，用于多语言
    size: string;
    sizeBytes: number;   // 用于排序
    builtIn?: boolean;
}

// 所有可下载模型（按体积从小到大排序）
export const ALL_MODELS: RecommendedModel[] = [
    {
        name: 'qwen2.5:0.5b',
        description: 'Qwen2.5 0.5B',
        taglineKey: 'models.qwen05b',
        size: '397MB',
        sizeBytes: 397,
        builtIn: true
    },
    {
        name: 'gemma3:1b',
        description: 'Gemma3 1B',
        taglineKey: 'models.gemma1b',
        size: '815MB',
        sizeBytes: 815
    },
    {
        name: 'qwen2.5:1.5b',
        description: 'Qwen2.5 1.5B',
        taglineKey: 'models.qwen15b',
        size: '986MB',
        sizeBytes: 986
    },
    {
        name: 'llama3.2:1b',
        description: 'Llama 3.2 1B',
        taglineKey: 'models.llama1b',
        size: '1.3GB',
        sizeBytes: 1300
    },
    {
        name: 'llama3.2:3b',
        description: 'Llama 3.2 3B',
        taglineKey: 'models.llama3b',
        size: '2.0GB',
        sizeBytes: 2000
    },
    {
        name: 'phi3:mini',
        description: 'Phi-3 Mini',
        taglineKey: 'models.phi3mini',
        size: '2.3GB',
        sizeBytes: 2300
    },
    {
        name: 'gemma3:4b',
        description: 'Gemma3 4B',
        taglineKey: 'models.gemma4b',
        size: '3.3GB',
        sizeBytes: 3300
    },
    {
        name: 'mistral:7b',
        description: 'Mistral 7B',
        taglineKey: 'models.mistral7b',
        size: '4.1GB',
        sizeBytes: 4100
    },
    {
        name: 'qwen2.5:7b',
        description: 'Qwen2.5 7B',
        taglineKey: 'models.qwen7b',
        size: '4.7GB',
        sizeBytes: 4700
    },
    {
        name: 'gemma3:12b',
        description: 'Gemma3 12B',
        taglineKey: 'models.gemma12b',
        size: '8.1GB',
        sizeBytes: 8100
    },
    {
        name: 'qwen2.5:14b',
        description: 'Qwen2.5 14B',
        taglineKey: 'models.qwen14b',
        size: '9.0GB',
        sizeBytes: 9000
    },
];

// 兼容旧代码的导出
export const RECOMMENDED_MODELS = ALL_MODELS.slice(0, 5);
export const ADVANCED_MODELS = ALL_MODELS.slice(5);
