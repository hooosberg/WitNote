/**
 * useLLM Hook
 * Ollama-only 架构：简化的本地AI引擎管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    LLMMessage,
    ChatMessage,
    LLMStatus,
    LoadProgress,
    OllamaModel,
    getDefaultSystemPrompt,
    RECOMMENDED_MODELS
} from '../services/types';
import { OllamaService } from '../services/OllamaService';
import { useSettings } from './useSettings';
import { getCurrentLanguage } from '../i18n';

// 上下文最大长度
const MAX_CONTEXT_LENGTH = 4000;

export interface UseLLMReturn {
    // 状态
    status: LLMStatus;
    modelName: string;
    loadProgress: LoadProgress | null;
    errorMessage: string | null;

    // Ollama 模型
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
    injectMessage: (role: 'system' | 'user' | 'assistant', content: string) => void;
    setMessages: (messages: ChatMessage[]) => void;
    retryDetection: () => void;
    loadChatHistory: (filePath: string) => Promise<ChatMessage[]>;
    unloadModel: () => void;

    // 模型管理
    refreshModels: () => Promise<void>;
    pullModel: (modelName: string) => Promise<void>;
    deleteModel: (modelName: string) => Promise<void>;
    cancelPull: (modelName?: string) => Promise<void>;
    downloadProgressMap: Map<string, { output: string; progress: number }>;
}

// 导出推荐模型供UI使用
export { RECOMMENDED_MODELS };

// 生成唯一 ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useLLM(): UseLLMReturn {
    const { settings } = useSettings();
    // 如果用户设置了自定义提示词则使用，否则使用内置默认提示词
    const userSystemPrompt = settings.systemPrompt;

    // 状态
    const [status, setStatus] = useState<LLMStatus>('detecting');
    const [modelName, setModelName] = useState<string>('');
    const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Ollama 状态
    const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');

    // 模型管理状态 - 使用 Map 支持多模型并行下载
    const [downloadProgressMap, setDownloadProgressMap] = useState<Map<string, { output: string; progress: number }>>(new Map());

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
    const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
    const [activeChatPath, setActiveChatPath] = useState<string | null>(null);
    const sessionChatCache = useRef<Map<string, ChatMessage[]>>(new Map());

    // 服务引用
    const ollamaServiceRef = useRef<OllamaService | null>(null);

    // 监听下载进度 - 按模型名分别追踪进度
    useEffect(() => {
        if (!window.ollama) return;
        return window.ollama.onPullProgress((data) => {
            // 从 output 中解析进度百分比，例如 "pulling manifest" 或 "pulling sha256:xxx 50%"
            const percentMatch = data.output.match(/(\d+)%/);
            const progress = percentMatch ? parseInt(percentMatch[1], 10) : 0;
            setDownloadProgressMap(prev => {
                const next = new Map(prev);
                next.set(data.model, { output: data.output, progress });
                return next;
            });
        });
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
        setContextType('folder');
        setActiveFolderName(name);
        setActiveFolderFiles(files);
        setFilePreviews(previews || new Map());
        setActiveFilePath(null);
        setActiveFileName(null);
        setActiveFileContent(null);
    }, []);

    /**
     * 刷新已安装模型列表
     */
    const refreshModels = useCallback(async () => {
        if (!window.ollama) return;
        try {
            const result = await window.ollama.listModels();
            if (result && result.success && Array.isArray(result.models)) {
                const mappedModels: OllamaModel[] = result.models.map((m: any) => ({
                    name: m.name,
                    size: parseInt(m.size) || 0,
                    digest: m.id,
                    modified_at: m.modified,
                    formattedSize: m.size
                }));
                setOllamaModels(mappedModels);
                console.log('📦 已安装模型列表:', mappedModels.map(m => m.name));
            }
        } catch (e) {
            console.error('刷新模型列表失败:', e);
        }
    }, []);

    /**
     * 下载模型
     */
    const pullModel = useCallback(async (modelName: string) => {
        if (!window.ollama) return;

        // 设置初始下载状态
        setDownloadProgressMap(prev => {
            const next = new Map(prev);
            next.set(modelName, { output: '开始下载...', progress: 0 });
            return next;
        });

        try {
            const result = await window.ollama.pullModel(modelName);
            if (result.success) {
                console.log(`✅ 模型 ${modelName} 下载成功`);
                await refreshModels();
            } else {
                throw new Error(result.output || '下载失败');
            }
        } catch (error) {
            console.error(`❌ 模型 ${modelName} 下载失败:`, error);
            setErrorMessage(`下载失败: ${error instanceof Error ? error.message : String(error)}`);
            setTimeout(() => setErrorMessage(null), 3000);
        } finally {
            // 清除该模型的下载进度
            setDownloadProgressMap(prev => {
                const next = new Map(prev);
                next.delete(modelName);
                return next;
            });
        }
    }, [refreshModels]);

    /**
     * 删除模型
     */
    const deleteModel = useCallback(async (modelName: string) => {
        if (!window.ollama) return;
        if (!confirm(`确定要删除模型 ${modelName} 吗？`)) return;

        try {
            const result = await window.ollama.deleteModel(modelName);
            if (result.success) {
                console.log(`🗑️ 模型 ${modelName} 删除成功`);
                await refreshModels();
                if (modelName === selectedOllamaModel) {
                    setSelectedOllamaModel(ollamaModels[0]?.name || '');
                }
            }
        } catch (error) {
            console.error(`❌ 模型 ${modelName} 删除失败:`, error);
        }
    }, [refreshModels, selectedOllamaModel, ollamaModels]);

    /**
     * 取消下载 - 支持取消特定模型
     */
    const cancelPull = useCallback(async (modelName?: string) => {
        if (!window.ollama) return;

        try {
            const result = await window.ollama.cancelPull(modelName);
            if (result.success) {
                console.log(`🛑 已取消下载: ${result.cancelled}`);
                // 清除被取消模型的下载进度
                if (result.cancelled) {
                    // 可能是多个模型名（逗号分隔）
                    const cancelledNames = result.cancelled.split(', ');
                    setDownloadProgressMap(prev => {
                        const next = new Map(prev);
                        cancelledNames.forEach(name => next.delete(name));
                        return next;
                    });
                } else {
                    // 如果没有返回具体模型名，清除所有
                    setDownloadProgressMap(new Map());
                }
                await refreshModels();
            }
        } catch (error) {
            console.error('取消下载失败:', error);
            // 如果指定了模型名，只清除该模型
            if (modelName) {
                setDownloadProgressMap(prev => {
                    const next = new Map(prev);
                    next.delete(modelName);
                    return next;
                });
            } else {
                setDownloadProgressMap(new Map());
            }
        }
    }, [refreshModels]);

    /**
     * 初始化 Ollama
     */
    const initializeOllama = useCallback(async (models: OllamaModel[]) => {
        console.log('🟢 初始化 Ollama...');
        setOllamaModels(models);

        // 从 localStorage 恢复已保存的模型选择，如果不存在或无效则使用第一个模型
        const savedModel = localStorage.getItem('zen-selected-ollama-model');
        const modelToUse = savedModel && models.some(m => m.name === savedModel)
            ? savedModel
            : models[0].name;

        setSelectedOllamaModel(modelToUse);
        setModelName(modelToUse);

        const ollamaService = new OllamaService(modelToUse);
        try {
            await ollamaService.initialize();
            ollamaServiceRef.current = ollamaService;
            setStatus('ready');
            console.log('✅ Ollama 初始化成功，使用模型:', modelToUse);
        } catch (error) {
            console.error('❌ Ollama 初始化失败:', error);
            setErrorMessage('Ollama 初始化失败');
            setStatus('error');
        }
    }, []);

    /**
     * 检测并初始化
     */
    const detectAndInitialize = useCallback(async () => {
        console.log('🔍 开始检测 Ollama 引擎...');
        setStatus('detecting');
        setLoadProgress(null);
        setErrorMessage(null);

        // 尝试 HTTP 检测
        const httpModels = await OllamaService.detect();

        // 尝试 IPC 获取模型列表
        let models: OllamaModel[] = [];
        if (window.ollama) {
            try {
                const listResult = await window.ollama.listModels();
                if (listResult && listResult.success && Array.isArray(listResult.models)) {
                    models = listResult.models.map((m: any) => ({
                        name: m.name,
                        size: 0,
                        digest: m.id,
                        modified_at: m.modified,
                        formattedSize: m.size
                    }));
                }
            } catch (e) {
                console.log('IPC listModels 失败:', e);
            }
        }

        // 合并结果
        if (models.length === 0 && httpModels) {
            models = httpModels;
        }

        if (models.length > 0) {
            console.log('✅ Ollama 检测成功，模型数:', models.length);
            await initializeOllama(models);
        } else {
            console.log('⚠️ 未检测到 Ollama 服务或模型');
            setErrorMessage('未检测到 Ollama 服务。请确保应用已正确启动。');
            setStatus('error');
        }
    }, [initializeOllama]);

    /**
     * 获取系统提示词
     * 如果用户设置了自定义提示词则使用，否则根据当前语言使用内置默认提示词
     */
    const getSystemPrompt = useCallback(() => {
        if (userSystemPrompt && userSystemPrompt.trim()) {
            return userSystemPrompt.trim();
        }
        // 根据当前语言获取默认提示词
        return getDefaultSystemPrompt(getCurrentLanguage());
    }, [userSystemPrompt]);

    /**
     * 构建上下文信息
     */
    const buildContextInfo = useCallback((): string | null => {
        if (activeFileContent && activeFileName) {
            const truncatedContent = activeFileContent.slice(0, MAX_CONTEXT_LENGTH);
            const isTruncated = activeFileContent.length > MAX_CONTEXT_LENGTH;
            return `【当前状态】用户正在编辑文章「${activeFileName}」

文章内容:
"""
${truncatedContent}${isTruncated ? '\n... (内容已截断)' : ''}
"""`;
        }

        if (activeFolderName && activeFolderFiles.length > 0) {
            const filesToShow = activeFolderFiles.slice(0, 20);
            const hasMore = activeFolderFiles.length > 20;
            const fileListWithPreviews = filesToShow.map((f, i) => {
                const preview = filePreviews.get(f);
                return preview ? `${i + 1}. ${f}：${preview}` : `${i + 1}. ${f}`;
            }).join('\n');

            return `【当前状态】用户正在浏览文件夹「${activeFolderName}」
【文件列表】共 ${activeFolderFiles.length} 个：
${fileListWithPreviews}${hasMore ? '\n... (更多文件)' : ''}`;
        }

        if (activeFolderFiles.length > 0) {
            const filesToShow = activeFolderFiles.slice(0, 30);
            const hasMore = activeFolderFiles.length > 30;
            const fileListWithPreviews = filesToShow.map((f, i) => {
                const preview = filePreviews.get(f);
                return preview ? `${i + 1}. ${f}：${preview}` : `${i + 1}. ${f}`;
            }).join('\n');

            return `【当前状态】用户正在查看全部笔记（根目录）
【文件列表】共 ${activeFolderFiles.length} 篇：
${fileListWithPreviews}${hasMore ? '\n... (更多文章)' : ''}`;
        }

        return null;
    }, [activeFileContent, activeFileName, activeFolderName, activeFolderFiles, filePreviews]);

    /**
     * 搜索文件
     */
    const searchFiles = useCallback((userMessage: string): string | null => {
        if (filePreviews.size === 0) return null;

        const searchIntentWords = ['有没有', '有什么', '关于', '找', '搜索', '查', '哪里', '哪个', '哪些'];
        const hasSearchIntent = searchIntentWords.some(word => userMessage.includes(word));
        if (!hasSearchIntent) return null;

        const stopWords = ['有没有', '有什么', '关于', '的', '吗', '呢', '文章', '文件', '找', '搜索'];
        let query = userMessage;
        stopWords.forEach(word => {
            query = query.replace(new RegExp(word, 'g'), '');
        });
        query = query.trim();
        if (!query || query.length < 2) return null;

        const matches: Array<{ name: string, preview: string }> = [];
        filePreviews.forEach((preview, name) => {
            if (name.includes(query) || preview.includes(query)) {
                matches.push({ name, preview });
            }
        });

        if (matches.length === 0) return null;

        const resultList = matches.slice(0, 5).map((m, i) =>
            `${i + 1}. ${m.name}${m.preview ? `\n   摘要：${m.preview}` : ''}`
        ).join('\n');

        return `【搜索结果】"${query}"匹配到 ${matches.length} 个文件：\n${resultList}`;
    }, [filePreviews]);

    /**
     * 发送消息
     */
    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isGenerating) return;
        if (status !== 'ready') {
            console.warn('⚠️ Ollama 服务未就绪');
            return;
        }

        const userMessage: ChatMessage = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now()
        };

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

        // 构建 LLM 消息
        const llmMessages: LLMMessage[] = [];
        const contextInfo = buildContextInfo();
        const searchResult = searchFiles(content.trim());

        let systemContent = getSystemPrompt();
        if (contextInfo) systemContent += '\n\n' + contextInfo;
        if (searchResult) systemContent += '\n\n' + searchResult;
        llmMessages.push({ role: 'system', content: systemContent });

        messages.forEach(m => {
            llmMessages.push({ role: m.role, content: m.content });
        });
        llmMessages.push({ role: 'user', content: content.trim() });

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
                if (lastMsg) lastMsg.isStreaming = false;
                return updated;
            });
            setIsGenerating(false);

            // 保存聊天记录
            if (activeChatPath) {
                const finalMessages = [...newMessages];
                finalMessages[finalMessages.length - 1].isStreaming = false;

                if (activeChatPath.startsWith('__')) {
                    sessionChatCache.current.set(activeChatPath, finalMessages);
                } else if (window.chat) {
                    try {
                        await window.chat.save(activeChatPath, finalMessages);
                    } catch (error) {
                        console.error('保存聊天记录失败:', error);
                    }
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

        try {
            if (ollamaServiceRef.current) {
                await ollamaServiceRef.current.streamChat(llmMessages, onToken, onComplete, onError);
            } else {
                throw new Error('Ollama 服务未初始化');
            }
        } catch (error) {
            onError(error instanceof Error ? error : new Error('未知错误'));
        }
    }, [messages, isGenerating, status, activeChatPath, buildContextInfo, getSystemPrompt, searchFiles]);

    /**
     * 加载聊天历史
     */
    const loadChatHistory = useCallback(async (chatPath: string): Promise<ChatMessage[]> => {
        setActiveChatPath(chatPath);

        if (chatPath.startsWith('__')) {
            const cached = sessionChatCache.current.get(chatPath) || [];
            setMessages(cached);
            return cached;
        }

        if (!window.chat) return [];
        try {
            const history = await window.chat.load(chatPath) as ChatMessage[];
            setMessages(history || []);
            return history || [];
        } catch (error) {
            console.error('加载聊天记录失败:', error);
            setMessages([]);
            return [];
        }
    }, []);

    /**
     * 中止生成
     */
    const abortGeneration = useCallback(() => {
        if (ollamaServiceRef.current) {
            ollamaServiceRef.current.abort();
        }
        setIsGenerating(false);
    }, []);

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
        // 保存到 localStorage
        localStorage.setItem('zen-selected-ollama-model', model);
        if (ollamaServiceRef.current) {
            ollamaServiceRef.current.setModel(model);
        }
    }, []);

    /**
     * 卸载模型
     */
    const unloadModel = useCallback(() => {
        console.log('📤 卸载 Ollama 模型...');
        ollamaServiceRef.current = null;
        setStatus('detecting');
        setModelName('');
    }, []);

    /**
     * 注入消息
     */
    const injectMessage = useCallback((role: 'system' | 'user' | 'assistant', content: string) => {
        const newMessage: ChatMessage = {
            id: generateId(),
            role,
            content,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMessage]);
    }, []);

    // 启动时检测
    useEffect(() => {
        detectAndInitialize();
    }, [detectAndInitialize]);

    return {
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
        injectMessage,
        setMessages,
        retryDetection,
        loadChatHistory,
        unloadModel,
        refreshModels,
        pullModel,
        deleteModel,
        cancelPull,
        downloadProgressMap
    };
}

export default useLLM;
