/**
 * useLLM Hook
 * 核心：双引擎管理，自动检测 Ollama 并智能切换
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    LLMProviderType,
    LLMMessage,
    ChatMessage,
    LLMStatus,
    LoadProgress,
    OllamaModel,
    DEFAULT_WEBLLM_MODEL
} from '../services/types';
import { OllamaService } from '../services/OllamaService';
import { WebLLMService } from '../services/WebLLMService';

export interface UseLLMReturn {
    // 状态
    providerType: LLMProviderType;
    status: LLMStatus;
    modelName: string;
    loadProgress: LoadProgress | null;

    // Ollama 相关
    ollamaModels: OllamaModel[];
    selectedOllamaModel: string;
    setSelectedOllamaModel: (model: string) => void;

    // 聊天相关
    messages: ChatMessage[];
    isGenerating: boolean;

    // 方法
    sendMessage: (content: string) => Promise<void>;
    abortGeneration: () => void;
    clearMessages: () => void;
    retryDetection: () => void;
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

    // Ollama 状态
    const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
    const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');

    // 聊天状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // 服务引用
    const ollamaServiceRef = useRef<OllamaService | null>(null);
    const webllmServiceRef = useRef<WebLLMService | null>(null);

    /**
     * 检测并初始化 LLM 引擎
     */
    const detectAndInitialize = useCallback(async () => {
        console.log('🔍 开始检测 LLM 引擎...');
        setStatus('detecting');
        setLoadProgress(null);

        // Step 1: 尝试探测 Ollama
        const models = await OllamaService.detect();

        if (models && models.length > 0) {
            // Case A: Ollama 在线且有模型
            console.log('✅ Ollama Detected: YES');
            console.log(`📋 可用模型: ${models.map(m => m.name).join(', ')}`);

            setOllamaModels(models);
            setSelectedOllamaModel(models[0].name);
            setProviderType('ollama');
            setModelName(models[0].name);

            // 初始化 Ollama 服务
            const ollamaService = new OllamaService(models[0].name);
            try {
                await ollamaService.initialize();
                ollamaServiceRef.current = ollamaService;
                setStatus('ready');

                // 自测消息
                console.log('🧪 Ollama 自测通过');
            } catch (error) {
                console.error('❌ Ollama 初始化失败，降级到 WebLLM:', error);
                await initializeWebLLM();
            }
        } else {
            // Case B: Ollama 离线或无模型
            console.log('⚠️ Ollama Detected: NO, falling back to WebLLM');
            await initializeWebLLM();
        }
    }, []);

    /**
     * 初始化 WebLLM
     */
    const initializeWebLLM = async () => {
        setProviderType('webllm');
        setModelName(DEFAULT_WEBLLM_MODEL);
        setStatus('loading');

        const webllmService = new WebLLMService();

        // 设置进度回调
        webllmService.setProgressCallback((progress) => {
            setLoadProgress(progress);
            console.log(`📥 加载进度: ${progress.progress}% - ${progress.text}`);
        });

        try {
            await webllmService.initialize();
            webllmServiceRef.current = webllmService;
            setStatus('ready');
            setLoadProgress(null);

            console.log('🧪 WebLLM 自测通过');
        } catch (error) {
            console.error('❌ WebLLM 初始化失败:', error);
            setStatus('error');
        }
    };

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

        // 添加空的助手消息（用于流式填充）
        const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setIsGenerating(true);

        // 准备历史消息
        const historyMessages: LLMMessage[] = messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        historyMessages.push({ role: 'user', content: content.trim() });

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

        const onComplete = () => {
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg) {
                    lastMsg.isStreaming = false;
                }
                return updated;
            });
            setIsGenerating(false);
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

        // 根据当前提供者调用对应服务
        try {
            if (providerType === 'ollama' && ollamaServiceRef.current) {
                await ollamaServiceRef.current.streamChat(historyMessages, onToken, onComplete, onError);
            } else if (providerType === 'webllm' && webllmServiceRef.current) {
                await webllmServiceRef.current.streamChat(historyMessages, onToken, onComplete, onError);
            } else {
                throw new Error('没有可用的 LLM 服务');
            }
        } catch (error) {
            onError(error instanceof Error ? error : new Error('未知错误'));
        }
    }, [messages, isGenerating, status, providerType]);

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

        // 清理
        return () => {
            if (webllmServiceRef.current) {
                webllmServiceRef.current.destroy();
            }
        };
    }, [detectAndInitialize]);

    return {
        providerType,
        status,
        modelName,
        loadProgress,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel: handleSetSelectedOllamaModel,
        messages,
        isGenerating,
        sendMessage,
        abortGeneration,
        clearMessages,
        retryDetection
    };
}

export default useLLM;
