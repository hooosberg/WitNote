/**
 * useLLM Hook
 * 核心：双引擎管理、心跳检测、上下文注入、聊天持久化
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    LLMProviderType,
    LLMMessage,
    ChatMessage,
    LLMStatus,
    LoadProgress,
    OllamaModel,
    DEFAULT_WEBLLM_MODEL,
    SYSTEM_PROMPT_LITE,
    SYSTEM_PROMPT_FULL
} from '../services/types';
import { OllamaService } from '../services/OllamaService';
import { WebLLMService } from '../services/WebLLMService';

// 心跳检测间隔 (毫秒)
const HEARTBEAT_INTERVAL = 5000;
// 连续失败次数阈值
const HEARTBEAT_FAIL_THRESHOLD = 2;
// 上下文最大长度
const MAX_CONTEXT_LENGTH = 4000;

// 引擎切换事件
export type EngineChangeEvent = {
    from: LLMProviderType;
    to: LLMProviderType;
    reason: 'heartbeat' | 'manual';
};

export interface UseLLMReturn {
    // 状态
    providerType: LLMProviderType;
    status: LLMStatus;
    modelName: string;
    loadProgress: LoadProgress | null;
    errorMessage: string | null;

    // Ollama 相关
    ollamaModels: OllamaModel[];
    selectedOllamaModel: string;
    setSelectedOllamaModel: (model: string) => void;

    // 聊天相关
    messages: ChatMessage[];
    isGenerating: boolean;

    // 上下文相关
    contextType: 'file' | 'folder' | null;
    activeFilePath: string | null;
    activeFileName: string | null;
    activeFileContent: string | null;
    activeFolderName: string | null;
    activeFolderFiles: string[];
    setActiveFileContext: (path: string | null, name: string | null, content: string | null) => void;
    setActiveFolderContext: (name: string | null, files: string[], previews?: Map<string, string>) => void;

    // 方法
    sendMessage: (content: string) => Promise<void>;
    abortGeneration: () => void;
    clearMessages: () => void;
    setMessages: (messages: ChatMessage[]) => void;
    retryDetection: () => void;
    loadChatHistory: (filePath: string) => Promise<void>;

    // 事件
    onEngineChange: (callback: (event: EngineChangeEvent) => void) => void;
}

// 生成唯一 ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useLLM(): UseLLMReturn {
    // 提供者状态
    const [providerType, setProviderType] = useState<LLMProviderType>('webllm');
    const [status, setStatus] = useState<LLMStatus>('detecting');
    const [modelName, setModelName] = useState<string>('');
    const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Ollama 状态
    const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');

    // 聊天状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // 上下文状态
    const [contextType, setContextType] = useState<'file' | 'folder' | null>(null);
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [activeFileName, setActiveFileName] = useState<string | null>(null);
    const [activeFileContent, setActiveFileContent] = useState<string | null>(null);
    const [activeFolderName, setActiveFolderName] = useState<string | null>(null);
    const [activeFolderFiles, setActiveFolderFiles] = useState<string[]>([]);
    // 文件摘要 Map：文件名 -> 前 N 字内容
    const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
    // 当前聊天记录路径（文件路径或虚拟路径）
    const [activeChatPath, setActiveChatPath] = useState<string | null>(null);

    // 服务引用
    const ollamaServiceRef = useRef<OllamaService | null>(null);
    const webllmServiceRef = useRef<WebLLMService | null>(null);

    // 心跳检测引用
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatFailCountRef = useRef(0);

    // 使用 ref 跟踪最新状态（解决闭包问题）
    const providerTypeRef = useRef<LLMProviderType>(providerType);
    const statusRef = useRef<LLMStatus>(status);

    // 同步状态到 ref
    useEffect(() => {
        providerTypeRef.current = providerType;
    }, [providerType]);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // 引擎切换回调
    const engineChangeCallbackRef = useRef<((event: EngineChangeEvent) => void) | null>(null);

    /**
     * 注册引擎切换回调
     */
    const onEngineChange = useCallback((callback: (event: EngineChangeEvent) => void) => {
        engineChangeCallbackRef.current = callback;
    }, []);

    /**
     * 触发引擎切换事件
     */
    const emitEngineChange = useCallback((event: EngineChangeEvent) => {
        console.log('🔄 引擎切换:', event.from, '->', event.to);
        if (engineChangeCallbackRef.current) {
            engineChangeCallbackRef.current(event);
        }
    }, []);

    /**
     * 设置活动文件上下文
     */
    const setActiveFileContext = useCallback((
        path: string | null,
        name: string | null,
        content: string | null
    ) => {
        setContextType(path ? 'file' : null);
        setActiveFilePath(path);
        setActiveFileName(name);
        setActiveFileContent(content);
        // 清空文件夹上下文
        setActiveFolderName(null);
        setActiveFolderFiles([]);
    }, []);

    /**
     * 设置活动文件夹上下文
     */
    const setActiveFolderContext = useCallback((
        name: string | null,
        files: string[],
        previews?: Map<string, string>
    ) => {
        // 调用此函数即表示选中了文件夹（包括空文件夹和根目录）
        setContextType('folder');
        setActiveFolderName(name);
        setActiveFolderFiles(files);
        setFilePreviews(previews || new Map());
        // 清空文件上下文
        setActiveFilePath(null);
        setActiveFileName(null);
        setActiveFileContent(null);
    }, []);

    /**
     * 初始化 WebLLM
     */
    const initializeWebLLM = useCallback(async () => {
        console.log('🔵 初始化 WebLLM...');
        setProviderType('webllm');
        setModelName(DEFAULT_WEBLLM_MODEL);
        setStatus('loading');

        const webllmService = new WebLLMService();

        webllmService.setProgressCallback((progress) => {
            setLoadProgress(progress);
        });

        try {
            await webllmService.initialize();
            webllmServiceRef.current = webllmService;
            setStatus('ready');
            setLoadProgress(null);
            console.log('✅ WebLLM 初始化成功');
        } catch (error) {
            console.error('❌ WebLLM 初始化失败:', error);
            const errMsg = error instanceof Error ? error.message : '未知错误';
            setErrorMessage(`WebLLM 初始化失败: ${errMsg}`);
            setStatus('error');
        }
    }, []);

    /**
     * 初始化 Ollama
     */
    const initializeOllama = useCallback(async (models: OllamaModel[]) => {
        console.log('🟢 初始化 Ollama...');
        setOllamaModels(models);
        setSelectedOllamaModel(models[0].name);
        setProviderType('ollama');
        setModelName(models[0].name);

        const ollamaService = new OllamaService(models[0].name);
        try {
            await ollamaService.initialize();
            ollamaServiceRef.current = ollamaService;
            setStatus('ready');
            console.log('✅ Ollama 初始化成功');
        } catch (error) {
            console.error('❌ Ollama 初始化失败:', error);
            throw error;
        }
    }, []);

    /**
     * 心跳检测 - 实时监测 Ollama 状态
     */
    const startHeartbeat = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
        }

        console.log('💓 启动心跳检测 (每 5 秒)');

        heartbeatRef.current = setInterval(async () => {
            const models = await OllamaService.detect();
            const currentProvider = providerTypeRef.current;
            const currentStatus = statusRef.current;

            console.log(`💓 心跳: provider=${currentProvider}, status=${currentStatus}, ollama=${models ? 'online' : 'offline'}`);

            if (models && models.length > 0) {
                // Ollama 在线
                heartbeatFailCountRef.current = 0;

                if (currentProvider === 'webllm' && currentStatus === 'ready') {
                    // 从 WebLLM 切换到 Ollama
                    console.log('💚 检测到 Ollama，自动切换...');

                    // 停止 WebLLM
                    if (webllmServiceRef.current) {
                        webllmServiceRef.current.destroy();
                        webllmServiceRef.current = null;
                    }

                    try {
                        await initializeOllama(models);
                        emitEngineChange({ from: 'webllm', to: 'ollama', reason: 'heartbeat' });
                    } catch (e) {
                        console.error('切换到 Ollama 失败:', e);
                    }
                }
            } else {
                // Ollama 离线
                heartbeatFailCountRef.current++;
                console.log(`💔 Ollama 离线, 失败次数: ${heartbeatFailCountRef.current}`);

                if (currentProvider === 'ollama' && heartbeatFailCountRef.current >= HEARTBEAT_FAIL_THRESHOLD) {
                    // 从 Ollama 切换到 WebLLM
                    console.log('💔 Ollama 持续离线，自动降级到 WebLLM...');

                    ollamaServiceRef.current = null;
                    emitEngineChange({ from: 'ollama', to: 'webllm', reason: 'heartbeat' });

                    await initializeWebLLM();
                    heartbeatFailCountRef.current = 0;
                }
            }
        }, HEARTBEAT_INTERVAL);
    }, [initializeOllama, initializeWebLLM, emitEngineChange]);

    /**
     * 检测并初始化 LLM 引擎
     */
    const detectAndInitialize = useCallback(async () => {
        console.log('🔍 开始检测 LLM 引擎...');
        setStatus('detecting');
        setLoadProgress(null);
        setErrorMessage(null);

        const models = await OllamaService.detect();

        if (models && models.length > 0) {
            console.log('✅ Ollama Detected: YES');
            console.log(`📋 可用模型: ${models.map(m => m.name).join(', ')}`);

            try {
                await initializeOllama(models);
            } catch {
                console.log('⚠️ Ollama 初始化失败，降级到 WebLLM');
                await initializeWebLLM();
            }
        } else {
            console.log('⚠️ Ollama Detected: NO, 使用 WebLLM');
            await initializeWebLLM();
        }

        // 启动心跳检测
        startHeartbeat();
    }, [initializeOllama, initializeWebLLM, startHeartbeat]);

    /**
     * 根据模型类型获取合适的系统提示词
     */
    const getSystemPrompt = useCallback(() => {
        // Ollama 大模型用完整版，WebLLM 微型模型用精简版
        return providerType === 'ollama' ? SYSTEM_PROMPT_FULL : SYSTEM_PROMPT_LITE;
    }, [providerType]);

    /**
     * 构建上下文信息（不包含系统提示词）
     */
    const buildContextInfo = useCallback((): string | null => {
        const isLiteMode = providerType === 'webllm';

        // 文件上下文
        if (activeFileContent && activeFileName) {
            const truncatedContent = activeFileContent.slice(0, MAX_CONTEXT_LENGTH);
            const isTruncated = activeFileContent.length > MAX_CONTEXT_LENGTH;

            if (isLiteMode) {
                return `文章「${activeFileName}」:
"""
${truncatedContent}${isTruncated ? '\n...' : ''}
"""`;
            } else {
                return `【当前状态】用户正在编辑文章「${activeFileName}」
【你的角色】专注于这篇文章的写作助手

文章内容:
"""
${truncatedContent}${isTruncated ? '\n... (内容已截断)' : ''}
"""`;
            }
        }

        // 子文件夹上下文
        if (activeFolderName && activeFolderFiles.length > 0) {
            const limit = isLiteMode ? 10 : 20;
            const filesToShow = activeFolderFiles.slice(0, limit);
            const hasMore = activeFolderFiles.length > limit;

            // 构建文件列表（带摘要）
            const fileListWithPreviews = filesToShow.map((f, i) => {
                const preview = filePreviews.get(f);
                return preview ? `${i + 1}. ${f}：${preview}` : `${i + 1}. ${f}`;
            }).join('\n');

            if (isLiteMode) {
                return `【你能看到的文件】文件夹「${activeFolderName}」共 ${activeFolderFiles.length} 个文件：
${fileListWithPreviews}${hasMore ? '\n...' : ''}`;
            } else {
                return `【当前状态】用户正在浏览文件夹「${activeFolderName}」
【你能看到的文件】共 ${activeFolderFiles.length} 个：
${fileListWithPreviews}${hasMore ? '\n... (更多文件)' : ''}`;
            }
        }

        // 根目录上下文
        if (activeFolderFiles.length > 0) {
            const limit = isLiteMode ? 15 : 30;
            const filesToShow = activeFolderFiles.slice(0, limit);
            const hasMore = activeFolderFiles.length > limit;

            // 构建文件列表（带摘要）
            const fileListWithPreviews = filesToShow.map((f, i) => {
                const preview = filePreviews.get(f);
                return preview ? `${i + 1}. ${f}：${preview}` : `${i + 1}. ${f}`;
            }).join('\n');

            if (isLiteMode) {
                return `【你能看到的文件】笔记库共 ${activeFolderFiles.length} 篇文章：
${fileListWithPreviews}${hasMore ? '\n...' : ''}`;
            } else {
                return `【当前状态】用户正在查看全部笔记（根目录）
【你能看到的文件】共 ${activeFolderFiles.length} 篇文章：
${fileListWithPreviews}${hasMore ? '\n... (更多文章)' : ''}`;
            }
        }

        return null;
    }, [activeFileContent, activeFileName, activeFolderName, activeFolderFiles, filePreviews, providerType]);

    /**
     * 构建上下文增强的系统提示词
     */
    const buildContextPrompt = useCallback((userInput: string): string => {
        const systemPrompt = getSystemPrompt();
        const isLiteMode = providerType === 'webllm';

        // 文件上下文 - 用户正在编辑某篇文章
        if (activeFileContent && activeFileName) {
            const truncatedContent = activeFileContent.slice(0, MAX_CONTEXT_LENGTH);
            const isTruncated = activeFileContent.length > MAX_CONTEXT_LENGTH;

            if (isLiteMode) {
                // WebLLM 精简版
                return `${systemPrompt}

文章「${activeFileName}」:
"""
${truncatedContent}${isTruncated ? '\n...' : ''}
"""

用户: ${userInput}`;
            } else {
                // Ollama 完整版
                return `${systemPrompt}

【当前状态】用户正在编辑文章「${activeFileName}」
【你的角色】专注于这篇文章的写作助手
【可以帮助】润色文字、续写内容、修改段落、提取要点、回答文章相关问题

文章内容:
"""
${truncatedContent}${isTruncated ? '\n... (内容已截断)' : ''}
"""

用户: ${userInput}`;
            }
        }

        // 子文件夹上下文 - 用户正在浏览某个主题文件夹
        if (activeFolderName && activeFolderFiles.length > 0) {
            const fileList = activeFolderFiles.slice(0, isLiteMode ? 10 : 20).map(f => `- ${f}`).join('\n');
            const hasMore = activeFolderFiles.length > (isLiteMode ? 10 : 20);

            if (isLiteMode) {
                return `${systemPrompt}

文件夹「${activeFolderName}」包含 ${activeFolderFiles.length} 个文件:
${fileList}${hasMore ? '\n...' : ''}

用户: ${userInput}`;
            } else {
                return `${systemPrompt}

【当前状态】用户正在浏览文件夹「${activeFolderName}」
【你的角色】这个主题目录的导航助手
【可以帮助】介绍目录内容、查找特定文件、总结主题、回答目录相关问题

目录包含 ${activeFolderFiles.length} 个文件:
${fileList}${hasMore ? '\n... (更多文件)' : ''}

用户: ${userInput}`;
            }
        }

        // 根目录上下文 - 用户在全局视图
        if (activeFolderFiles.length > 0) {
            const fileList = activeFolderFiles.slice(0, isLiteMode ? 15 : 30).map(f => `- ${f}`).join('\n');
            const hasMore = activeFolderFiles.length > (isLiteMode ? 15 : 30);

            if (isLiteMode) {
                return `${systemPrompt}

笔记库共 ${activeFolderFiles.length} 篇文章:
${fileList}${hasMore ? '\n...' : ''}

用户: ${userInput}`;
            } else {
                return `${systemPrompt}

【当前状态】用户正在查看全部笔记（根目录）
【你的角色】全局写作顾问
【可以帮助】回顾整体写作情况、分析写作习惯、查找文件、提供写作建议

笔记库共有 ${activeFolderFiles.length} 篇文章:
${fileList}${hasMore ? '\n... (更多文章)' : ''}

用户: ${userInput}`;
            }
        }

        // 无上下文
        return `${systemPrompt}

用户: ${userInput}`;
    }, [activeFileContent, activeFileName, activeFolderName, activeFolderFiles, providerType, getSystemPrompt]);

    /**
     * 从用户消息中搜索匹配的文件
     * 只在用户有明确搜索意图时触发
     */
    const searchFiles = useCallback((userMessage: string): string | null => {
        if (filePreviews.size === 0) return null;

        // 判断是否有搜索意图（包含搜索相关词汇）
        const searchIntentWords = [
            '有没有', '有什么', '有啥', '关于', '找', '搜索', '搜', '查',
            '在哪', '哪里', '哪个', '哪些', '什么文件', '什么文章', '什么笔记'
        ];
        const hasSearchIntent = searchIntentWords.some(word => userMessage.includes(word));

        // 没有搜索意图，不执行搜索
        if (!hasSearchIntent) return null;

        // 提取关键词（去掉无意义词）
        const stopWords = [
            '有没有', '有什么', '有啥', '关于', '的', '吗', '呢', '啊', '了',
            '文章', '文件', '笔记', '是', '找', '搜索', '搜', '查', '看看',
            '帮我', '帮忙', '给我', '我要', '我想', '能不能', '可以', '请',
            '找找', '找一下', '查一下', '看一下', '在哪', '哪里', '什么', '哪个', '哪些'
        ];
        let query = userMessage;
        stopWords.forEach(word => {
            query = query.replace(new RegExp(word, 'g'), '');
        });
        query = query.trim();

        // 关键词太短或为空，不搜索
        if (!query || query.length < 2) return null;

        // 在文件名和摘要中搜索
        const matches: Array<{ name: string, preview: string, location: string }> = [];

        // 获取当前位置描述
        const currentLocation = activeFolderName ? `文件夹「${activeFolderName}」` : '根目录';

        filePreviews.forEach((preview, name) => {
            // 文件名或摘要包含关键词
            if (name.includes(query) || preview.includes(query)) {
                matches.push({ name, preview, location: currentLocation });
            }
        });

        // 也在 activeFolderFiles 中搜索（文件名）
        activeFolderFiles.forEach(name => {
            if (name.includes(query) && !matches.find(m => m.name === name)) {
                const preview = filePreviews.get(name) || '';
                matches.push({ name, preview, location: currentLocation });
            }
        });

        if (matches.length === 0) return null;

        // 构建搜索结果（含位置）
        const resultList = matches.slice(0, 5).map((m, i) =>
            `${i + 1}. ${m.name}（位置：${m.location}）${m.preview ? `\n   摘要：${m.preview}` : ''}`
        ).join('\n');

        return `【搜索结果】"${query}"匹配到 ${matches.length} 个文件：\n${resultList}`;
    }, [filePreviews, activeFolderFiles, activeFolderName]);

    /**
     * 发送消息
     */
    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isGenerating) return;
        if (status !== 'ready') {
            console.warn('⚠️ LLM 服务未就绪');
            return;
        }

        // 添加用户消息
        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now()
        };

        // 添加空的助手消息
        const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true
        };

        const newMessages = [...messages, userMessage, assistantMessage];
        setMessages(newMessages);
        setIsGenerating(true);

        // 构建发送给 LLM 的消息数组
        const llmMessages: LLMMessage[] = [];

        // 1. 添加系统提示词 + 上下文信息（合并为一条 system 消息）
        const contextInfo = buildContextInfo();

        // 2. 执行前端搜索
        const searchResult = searchFiles(content.trim());

        // 3. 合并系统内容
        let systemContent = getSystemPrompt();
        if (contextInfo) {
            systemContent += '\n\n' + contextInfo;
        }
        if (searchResult) {
            systemContent += '\n\n' + searchResult;
        }
        llmMessages.push({ role: 'system', content: systemContent });

        // 4. 添加历史消息
        messages.forEach(m => {
            llmMessages.push({ role: m.role, content: m.content });
        });

        // 3. 添加当前用户消息
        llmMessages.push({ role: 'user', content: content.trim() });

        // 流式回调
        const onToken = (token: string) => {
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content += token;
                }
                return updated;
            });
        };

        const onComplete = async () => {
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg) {
                    lastMsg.isStreaming = false;
                }
                return updated;
            });
            setIsGenerating(false);

            // 自动保存聊天记录（支持文件、文件夹和根目录）
            if (activeChatPath && window.chat) {
                try {
                    const finalMessages = [...newMessages];
                    finalMessages[finalMessages.length - 1].isStreaming = false;
                    await window.chat.save(activeChatPath, finalMessages);
                    console.log(`💾 聊天记录已保存 [${activeChatPath}]`);
                } catch (error) {
                    console.error('保存聊天记录失败:', error);
                }
            }
        };

        const onError = (error: Error) => {
            console.error('❌ 生成错误:', error);
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = `❌ 生成出错: ${error.message}`;
                    lastMsg.isStreaming = false;
                }
                return updated;
            });
            setIsGenerating(false);
        };

        // 调用对应服务
        try {
            if (providerType === 'ollama' && ollamaServiceRef.current) {
                await ollamaServiceRef.current.streamChat(llmMessages, onToken, onComplete, onError);
            } else if (providerType === 'webllm' && webllmServiceRef.current) {
                await webllmServiceRef.current.streamChat(llmMessages, onToken, onComplete, onError);
            } else {
                throw new Error('没有可用的 LLM 服务');
            }
        } catch (error) {
            onError(error instanceof Error ? error : new Error('未知错误'));
        }
    }, [messages, isGenerating, status, providerType, activeChatPath, buildContextInfo, getSystemPrompt, searchFiles]);

    /**
     * 加载聊天历史
     */
    const loadChatHistory = useCallback(async (chatPath: string) => {
        // 保存当前聊天路径（用于后续自动保存）
        setActiveChatPath(chatPath);

        if (!window.chat) return;
        try {
            const history = await window.chat.load(chatPath) as ChatMessage[];
            setMessages(history || []);
            console.log(`📂 加载聊天记录 [${chatPath}]: ${history?.length || 0} 条消息`);
        } catch (error) {
            console.error('加载聊天记录失败:', error);
            setMessages([]);
        }
    }, []);

    /**
     * 中止生成
     */
    const abortGeneration = useCallback(() => {
        if (providerType === 'ollama' && ollamaServiceRef.current) {
            ollamaServiceRef.current.abort();
        } else if (providerType === 'webllm' && webllmServiceRef.current) {
            webllmServiceRef.current.abort();
        }
        setIsGenerating(false);
    }, [providerType]);

    /**
     * 清空消息
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * 重新检测
     */
    const retryDetection = useCallback(() => {
        detectAndInitialize();
    }, [detectAndInitialize]);

    /**
     * 切换 Ollama 模型
     */
    const handleSetSelectedOllamaModel = useCallback((model: string) => {
        setSelectedOllamaModel(model);
        setModelName(model);

        if (ollamaServiceRef.current) {
            ollamaServiceRef.current.setModel(model);
        }
    }, []);

    // 启动时检测
    useEffect(() => {
        detectAndInitialize();

        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
            }
            if (webllmServiceRef.current) {
                webllmServiceRef.current.destroy();
            }
        };
    }, []);

    return {
        providerType,
        status,
        modelName,
        loadProgress,
        errorMessage,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel: handleSetSelectedOllamaModel,
        messages,
        isGenerating,
        contextType,
        activeFilePath,
        activeFileName,
        activeFileContent,
        activeFolderName,
        activeFolderFiles,
        setActiveFileContext,
        setActiveFolderContext,
        sendMessage,
        abortGeneration,
        clearMessages,
        setMessages,
        retryDetection,
        loadChatHistory,
        onEngineChange
    };
}

export default useLLM;
