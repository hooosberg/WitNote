/**
 * Engine Store - 状态管理
 * 管理 AI 引擎的状态：WebLLM / Ollama / Cloud API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OllamaModel } from '../services/types';
import { WebLLMEngine } from '../engines/WebLLMEngine';
import { OpenAIEngine } from '../engines/OpenAIEngine';
import { ALL_WEBLLM_MODELS_INFO, DEFAULT_WEBLLM_MODEL } from '../engines/webllmModels';

// 引擎类型
export type EngineType = 'webllm' | 'ollama' | 'openai';

// Ollama 配置
interface OllamaConfig {
    host: string;
    port: number;
}

// Cloud API 配置
interface CloudConfig {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    provider: 'openai' | 'deepseek' | 'custom';
}

// WebLLM 进度
interface WebLLMProgress {
    progress: number;
    text: string;
}

// 调试用：最后生成信息
interface LastGenerationInfo {
    timestamp: number;
    model: string;
    systemPrompt: string;
    userContext: string;
    contextLength: number;
}

// 导出返回类型
export interface UseEngineStoreReturn {
    // 引擎切换
    currentEngine: EngineType;
    setEngine: (engine: EngineType) => void;

    // WebLLM 状态
    webllmReady: boolean;
    webllmLoading: boolean;
    webllmProgress: WebLLMProgress | null;
    webllmFirstTimeSetup: boolean;
    webllmCachedModels: string[];
    initWebLLM: (modelId?: string) => Promise<void>;
    completeWebLLMSetup: () => void;
    resetWebLLMSetup: () => void;
    deleteWebLLMModel: (modelId: string) => Promise<void>;

    // 模型选择
    selectedModel: string;
    selectModel: (model: string) => void;

    // Ollama 状态
    ollamaAvailable: boolean;
    ollamaModels: OllamaModel[];
    ollamaConfig: OllamaConfig;
    updateOllamaConfig: (config: Partial<OllamaConfig>) => void;
    refreshOllamaStatus: () => Promise<void>;

    // Cloud API 状态
    cloudConfig: CloudConfig;
    cloudApiStatus: 'idle' | 'loading' | 'success' | 'error';
    updateCloudConfig: (config: Partial<CloudConfig>) => void;
    testCloudApi: () => Promise<void>;

    // 通用
    error: string | null;
    reportError: (message: string) => void;
    getEngine: () => WebLLMEngine | OpenAIEngine | null;

    // 调试
    lastGenerationInfo: LastGenerationInfo | null;
    setLastGenerationInfo: (info: LastGenerationInfo) => void;
}

// 存储键
const STORAGE_KEYS = {
    CURRENT_ENGINE: 'zen-current-engine',
    SELECTED_MODEL: 'zen-selected-model',
    WEBLLM_MODEL: 'zen-selected-webllm-model',
    OLLAMA_MODEL: 'zen-selected-ollama-model',
    OLLAMA_HOST: 'zen-ollama-host',
    OLLAMA_PORT: 'zen-ollama-port',
    CLOUD_API_KEY: 'zen-cloud-api-key',
    CLOUD_BASE_URL: 'zen-cloud-base-url',
    CLOUD_MODEL_NAME: 'zen-cloud-model-name',
    CLOUD_PROVIDER: 'zen-cloud-provider',
    WEBLLM_FIRST_TIME: 'zen-webllm-first-time-setup',
};

export function useEngineStore(): UseEngineStoreReturn {
    // 引擎类型
    const [currentEngine, setCurrentEngine] = useState<EngineType>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ENGINE);
        return (saved as EngineType) || 'ollama';
    });

    // WebLLM 状态
    const [webllmReady, setWebllmReady] = useState(false);
    const [webllmLoading, setWebllmLoading] = useState(false);
    const [webllmProgress, setWebllmProgress] = useState<WebLLMProgress | null>(null);
    const [webllmFirstTimeSetup, setWebllmFirstTimeSetup] = useState(() => {
        return localStorage.getItem(STORAGE_KEYS.WEBLLM_FIRST_TIME) !== 'false';
    });
    const [webllmCachedModels, setWebllmCachedModels] = useState<string[]>([]);
    const webllmEngineRef = useRef<WebLLMEngine | null>(null);

    // 模型选择
    const [selectedModel, setSelectedModel] = useState(() => {
        const engine = localStorage.getItem(STORAGE_KEYS.CURRENT_ENGINE) || 'ollama';
        if (engine === 'webllm') {
            return localStorage.getItem(STORAGE_KEYS.WEBLLM_MODEL) || DEFAULT_WEBLLM_MODEL;
        } else if (engine === 'ollama') {
            return localStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL) || '';
        } else {
            return localStorage.getItem(STORAGE_KEYS.CLOUD_MODEL_NAME) || 'gpt-4o-mini';
        }
    });

    // Ollama 状态
    const [ollamaAvailable, setOllamaAvailable] = useState(false);
    const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
    const [ollamaConfig, setOllamaConfig] = useState<OllamaConfig>(() => ({
        host: localStorage.getItem(STORAGE_KEYS.OLLAMA_HOST) || '127.0.0.1',
        port: parseInt(localStorage.getItem(STORAGE_KEYS.OLLAMA_PORT) || '11434'),
    }));

    // Cloud API 状态
    const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => ({
        apiKey: localStorage.getItem(STORAGE_KEYS.CLOUD_API_KEY) || '',
        baseUrl: localStorage.getItem(STORAGE_KEYS.CLOUD_BASE_URL) || 'https://api.openai.com/v1',
        modelName: localStorage.getItem(STORAGE_KEYS.CLOUD_MODEL_NAME) || 'gpt-4o-mini',
        provider: (localStorage.getItem(STORAGE_KEYS.CLOUD_PROVIDER) as CloudConfig['provider']) || 'openai',
    }));
    const [cloudApiStatus, setCloudApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const cloudEngineRef = useRef<OpenAIEngine | null>(null);

    // 错误状态
    const [error, setError] = useState<string | null>(null);

    // 调试状态
    const [lastGenerationInfo, setLastGenerationInfo] = useState<LastGenerationInfo | null>(null);

    // 检测 WebLLM 缓存
    useEffect(() => {
        const checkCache = async () => {
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    const webllmCaches = cacheNames.filter(name =>
                        name.includes('webllm') || name.includes('mlc')
                    );

                    // 检查每个模型是否已缓存
                    const cached: string[] = [];
                    for (const modelInfo of ALL_WEBLLM_MODELS_INFO) {
                        // 简单检查：如果有任何缓存，就认为模型可能已缓存
                        // 更精确的检查需要分析缓存内容
                        if (webllmCaches.length > 0) {
                            const modelCache = await caches.open(modelInfo.model_id);
                            const keys = await modelCache.keys();
                            if (keys.length > 0) {
                                cached.push(modelInfo.model_id);
                            }
                        }
                    }
                    setWebllmCachedModels(cached);
                }
            } catch (e) {
                console.log('检查 WebLLM 缓存失败:', e);
            }
        };
        checkCache();
    }, []);

    // 设置引擎
    const setEngine = useCallback((engine: EngineType) => {
        setCurrentEngine(engine);
        localStorage.setItem(STORAGE_KEYS.CURRENT_ENGINE, engine);
        setError(null);

        // 切换引擎时更新选中的模型
        if (engine === 'webllm') {
            const saved = localStorage.getItem(STORAGE_KEYS.WEBLLM_MODEL);
            setSelectedModel(saved || DEFAULT_WEBLLM_MODEL);
        } else if (engine === 'ollama') {
            const saved = localStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL);
            setSelectedModel(saved || ollamaModels[0]?.name || '');
        } else {
            setSelectedModel(cloudConfig.modelName);
        }
    }, [ollamaModels, cloudConfig.modelName]);

    // 初始化 WebLLM
    const initWebLLM = useCallback(async (modelId?: string) => {
        const targetModel = modelId || selectedModel || DEFAULT_WEBLLM_MODEL;

        console.log('🚀 初始化 WebLLM:', targetModel);
        setWebllmLoading(true);
        setWebllmReady(false);
        setError(null);
        setWebllmProgress({ progress: 0, text: '正在初始化...' });

        try {
            // 创建新的引擎实例
            const engine = new WebLLMEngine(targetModel);

            await engine.initialize((progress) => {
                setWebllmProgress({
                    progress: progress.progress || 0,
                    text: progress.text || '加载中...'
                });
            });

            webllmEngineRef.current = engine;
            setWebllmReady(true);
            setSelectedModel(targetModel);
            localStorage.setItem(STORAGE_KEYS.WEBLLM_MODEL, targetModel);

            // 更新缓存列表
            if (!webllmCachedModels.includes(targetModel)) {
                setWebllmCachedModels(prev => [...prev, targetModel]);
            }

            console.log('✅ WebLLM 初始化成功');
        } catch (e) {
            console.error('❌ WebLLM 初始化失败:', e);
            setError(e instanceof Error ? e.message : 'WebLLM 初始化失败');
            setWebllmReady(false);
        } finally {
            setWebllmLoading(false);
            setWebllmProgress(null);
        }
    }, [selectedModel, webllmCachedModels]);

    // 完成首次设置
    const completeWebLLMSetup = useCallback(() => {
        setWebllmFirstTimeSetup(false);
        localStorage.setItem(STORAGE_KEYS.WEBLLM_FIRST_TIME, 'false');
    }, []);

    // 重置 WebLLM 设置
    const resetWebLLMSetup = useCallback(() => {
        setWebllmLoading(false);
        setWebllmProgress(null);
        webllmEngineRef.current = null;
    }, []);

    // 删除 WebLLM 模型缓存
    const deleteWebLLMModel = useCallback(async (modelId: string) => {
        try {
            // 清除缓存
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.includes(modelId) || cacheName.includes('webllm') || cacheName.includes('mlc')) {
                        await caches.delete(cacheName);
                    }
                }
            }

            // 更新状态
            setWebllmCachedModels(prev => prev.filter(m => m !== modelId));

            // 如果删除的是当前模型，重置状态
            if (selectedModel === modelId) {
                setWebllmReady(false);
                webllmEngineRef.current = null;
            }

            console.log('✅ 已删除模型缓存:', modelId);
        } catch (e) {
            console.error('❌ 删除模型缓存失败:', e);
        }
    }, [selectedModel]);

    // 选择模型
    const selectModel = useCallback((model: string) => {
        setSelectedModel(model);

        if (currentEngine === 'webllm') {
            localStorage.setItem(STORAGE_KEYS.WEBLLM_MODEL, model);
        } else if (currentEngine === 'ollama') {
            localStorage.setItem(STORAGE_KEYS.OLLAMA_MODEL, model);
        } else {
            localStorage.setItem(STORAGE_KEYS.CLOUD_MODEL_NAME, model);
        }
    }, [currentEngine]);

    // 更新 Ollama 配置
    const updateOllamaConfig = useCallback((config: Partial<OllamaConfig>) => {
        setOllamaConfig(prev => {
            const updated = { ...prev, ...config };
            if (config.host !== undefined) {
                localStorage.setItem(STORAGE_KEYS.OLLAMA_HOST, config.host);
            }
            if (config.port !== undefined) {
                localStorage.setItem(STORAGE_KEYS.OLLAMA_PORT, String(config.port));
            }
            return updated;
        });
    }, []);

    // 刷新 Ollama 状态
    const refreshOllamaStatus = useCallback(async () => {
        try {
            const response = await fetch(`http://${ollamaConfig.host}:${ollamaConfig.port}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                setOllamaAvailable(true);
                if (Array.isArray(data.models)) {
                    const models: OllamaModel[] = data.models.map((m: any) => ({
                        name: m.name,
                        size: m.size || 0,
                        digest: m.digest || '',
                        modified_at: m.modified_at || '',
                        formattedSize: formatSize(m.size || 0),
                    }));
                    setOllamaModels(models);

                    // 如果没有选中模型，选择第一个
                    if (!selectedModel && models.length > 0) {
                        selectModel(models[0].name);
                    }
                }
            } else {
                setOllamaAvailable(false);
            }
        } catch (e) {
            console.log('Ollama 连接失败:', e);
            setOllamaAvailable(false);
        }
    }, [ollamaConfig.host, ollamaConfig.port, selectedModel, selectModel]);

    // 初始化时检测 Ollama
    useEffect(() => {
        if (currentEngine === 'ollama') {
            refreshOllamaStatus();
        }
    }, [currentEngine, refreshOllamaStatus]);

    // 更新 Cloud 配置
    const updateCloudConfig = useCallback((config: Partial<CloudConfig>) => {
        setCloudConfig(prev => {
            const updated = { ...prev, ...config };
            if (config.apiKey !== undefined) {
                localStorage.setItem(STORAGE_KEYS.CLOUD_API_KEY, config.apiKey);
            }
            if (config.baseUrl !== undefined) {
                localStorage.setItem(STORAGE_KEYS.CLOUD_BASE_URL, config.baseUrl);
            }
            if (config.modelName !== undefined) {
                localStorage.setItem(STORAGE_KEYS.CLOUD_MODEL_NAME, config.modelName);
                setSelectedModel(config.modelName);
            }
            if (config.provider !== undefined) {
                localStorage.setItem(STORAGE_KEYS.CLOUD_PROVIDER, config.provider);
            }
            return updated;
        });
    }, []);

    // 测试 Cloud API
    const testCloudApi = useCallback(async () => {
        if (!cloudConfig.apiKey) {
            setCloudApiStatus('error');
            setError('请先配置 API Key');
            return;
        }

        setCloudApiStatus('loading');
        setError(null);

        try {
            const engine = new OpenAIEngine({
                apiKey: cloudConfig.apiKey,
                baseUrl: cloudConfig.baseUrl,
                modelName: cloudConfig.modelName
            });

            const success = await engine.testConnection();
            if (success) {
                cloudEngineRef.current = engine;
                setCloudApiStatus('success');
                console.log('✅ Cloud API 测试成功');
            } else {
                throw new Error('连接测试失败');
            }
        } catch (e) {
            console.error('❌ Cloud API 测试失败:', e);
            setCloudApiStatus('error');
            setError(e instanceof Error ? e.message : 'API 连接失败');
        }
    }, [cloudConfig]);

    // 报告错误
    const reportError = useCallback((message: string) => {
        setError(message);
    }, []);

    // 获取当前引擎实例
    const getEngine = useCallback(() => {
        if (currentEngine === 'webllm') {
            return webllmEngineRef.current;
        } else if (currentEngine === 'openai') {
            return cloudEngineRef.current;
        }
        return null;
    }, [currentEngine]);

    return {
        currentEngine,
        setEngine,

        webllmReady,
        webllmLoading,
        webllmProgress,
        webllmFirstTimeSetup,
        webllmCachedModels,
        initWebLLM,
        completeWebLLMSetup,
        resetWebLLMSetup,
        deleteWebLLMModel,

        selectedModel,
        selectModel,

        ollamaAvailable,
        ollamaModels,
        ollamaConfig,
        updateOllamaConfig,
        refreshOllamaStatus,

        cloudConfig,
        cloudApiStatus,
        updateCloudConfig,
        testCloudApi,

        error,
        reportError,
        getEngine,

        lastGenerationInfo,
        setLastGenerationInfo,
    };
}

// 辅助函数：格式化文件大小
function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default useEngineStore;
