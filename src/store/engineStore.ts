/**
 * Engine Store - 三引擎状态管理
 * 管理 WebLLM, Ollama, Cloud API 三种引擎的状态
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OpenAIEngine, CloudConfig, DEFAULT_CLOUD_CONFIG } from '../engines/OpenAIEngine';
import { DEFAULT_WEBLLM_MODEL } from '../engines/webllmModels';
import { OllamaModel } from '../services/types';

export type EngineType = 'webllm' | 'ollama' | 'openai';

export interface OllamaConfig {
    host: string;
    port: number;
}

export interface EngineState {
    currentEngine: EngineType;
    selectedModel: string;

    // WebLLM 状态
    webllmReady: boolean;
    webllmLoading: boolean;
    webllmProgress: { progress: number; text: string } | null;
    webllmCachedModels: string[];

    // Ollama 状态
    ollamaAvailable: boolean;
    ollamaConfig: OllamaConfig;
    ollamaModels: OllamaModel[];

    // Cloud API 状态
    cloudConfig: CloudConfig;
    cloudApiStatus: 'untested' | 'success' | 'error';

    // 通用
    isLoading: boolean;
    error: string | null;
}

export interface UseEngineStoreReturn extends EngineState {
    setEngine: (engine: EngineType) => void;
    selectModel: (modelId: string) => void;

    // WebLLM
    initWebLLM: (modelId?: string) => Promise<void>;
    refreshWebLLMCache: () => Promise<void>;
    deleteWebLLMModel: (modelId: string) => Promise<void>;
    clearAllWebLLMCache: () => Promise<void>;

    // Ollama
    updateOllamaConfig: (config: Partial<OllamaConfig>) => void;
    refreshOllamaStatus: () => Promise<void>;

    // Cloud API
    updateCloudConfig: (config: Partial<CloudConfig>) => void;
    testCloudApi: () => Promise<boolean>;

    // 引擎访问
    getEngine: () => any;

    // 错误报告
    reportError: (error: string) => void;
}

const STORAGE_KEYS = {
    ENGINE: 'zen-ai-engine',
    MODEL: 'zen-selected-model',
    WEBLLM_MODEL: 'zen-selected-webllm-model',
    OLLAMA_MODEL: 'zen-selected-ollama-model',
    OLLAMA: 'zen-ollama-config',
    CLOUD: 'zen-cloud-config'
};

export function useEngineStore(): UseEngineStoreReturn {
    // 从 localStorage 恢复配置（默认使用 Ollama，WebLLM 有已知问题）
    const savedEngine = (localStorage.getItem(STORAGE_KEYS.ENGINE) as EngineType) || 'ollama';
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_WEBLLM_MODEL;
    const savedOllamaConfig: OllamaConfig = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.OLLAMA) || '{"host":"127.0.0.1","port":11434}'
    );
    const savedCloudConfig: CloudConfig = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CLOUD) || JSON.stringify(DEFAULT_CLOUD_CONFIG)
    );

    const [state, setState] = useState<EngineState>({
        currentEngine: savedEngine,
        selectedModel: savedModel,
        webllmReady: false,
        webllmLoading: false,
        webllmProgress: null,
        webllmCachedModels: [],
        ollamaAvailable: false,
        ollamaConfig: savedOllamaConfig,
        ollamaModels: [],
        cloudConfig: savedCloudConfig,
        cloudApiStatus: 'untested',
        isLoading: true,
        error: null
    });

    // 引擎实例引用
    const openaiEngineRef = useRef<OpenAIEngine | null>(null);
    const webllmEngineRef = useRef<any>(null);
    // 初始化锁（使用 ref 而非 state，确保同步检查，防止 React Strict Mode 下的重复初始化）
    const webllmInitLockRef = useRef<boolean>(false);

    // 设置引擎
    const setEngine = useCallback((engine: EngineType) => {
        localStorage.setItem(STORAGE_KEYS.ENGINE, engine);

        // 切换引擎时，恢复该引擎上次使用的模型
        let modelToRestore = DEFAULT_WEBLLM_MODEL;
        if (engine === 'webllm') {
            modelToRestore = localStorage.getItem(STORAGE_KEYS.WEBLLM_MODEL) || DEFAULT_WEBLLM_MODEL;
        } else if (engine === 'ollama') {
            // 如果只有 null，可以保留当前选中（但风险是当前选中可能是 webllm 的），或者用第一个 found model
            modelToRestore = localStorage.getItem(STORAGE_KEYS.OLLAMA_MODEL) || '';
        } else if (engine === 'openai') {
            modelToRestore = state.cloudConfig.modelName;
        }

        setState(prev => ({
            ...prev,
            currentEngine: engine,
            selectedModel: modelToRestore,
            error: null
        }));
    }, [state.cloudConfig.modelName]);

    // 选择模型
    const selectModel = useCallback((modelId: string) => {
        localStorage.setItem(STORAGE_KEYS.MODEL, modelId);

        // 分别存储引擎的模型选择
        if (state.currentEngine === 'webllm') {
            localStorage.setItem(STORAGE_KEYS.WEBLLM_MODEL, modelId);
        } else if (state.currentEngine === 'ollama') {
            localStorage.setItem(STORAGE_KEYS.OLLAMA_MODEL, modelId);
        }

        setState(prev => ({ ...prev, selectedModel: modelId }));
    }, [state.currentEngine]);

    // 初始化 WebLLM
    const initWebLLM = useCallback(async (modelId?: string) => {
        // 使用 ref 作为初始化锁（同步检查），防止 React Strict Mode 下的并发初始化
        if (webllmInitLockRef.current) {
            console.log('⚠️ WebLLM 正在初始化中（锁定），跳过...');
            return;
        }

        // 立即设置锁（同步操作）
        webllmInitLockRef.current = true;
        console.log('🔒 WebLLM 初始化锁已设置');

        const targetModel = modelId || state.selectedModel;

        // 取消之前的下载
        if (webllmEngineRef.current?.abort) {
            webllmEngineRef.current.abort();
        }

        setState(prev => ({
            ...prev,
            webllmLoading: true,
            webllmReady: false,
            webllmProgress: { progress: 0, text: '初始化中...' },
            selectedModel: targetModel,
            error: null // 清除之前的错误
        }));

        try {
            // 动态导入 WebLLM
            const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

            // 确保之前的引擎已卸载
            if (webllmEngineRef.current && webllmEngineRef.current.unload) {
                await webllmEngineRef.current.unload();
            }

            const engine = await CreateMLCEngine(targetModel, {
                initProgressCallback: (progress) => {
                    setState(prev => ({
                        ...prev,
                        webllmProgress: {
                            progress: progress.progress,
                            text: progress.text
                        }
                    }));
                }
            });

            webllmEngineRef.current = engine;
            localStorage.setItem(STORAGE_KEYS.MODEL, targetModel);

            // 预热引擎，确保 Tokenizer 的 WASM 绑定完全就绪
            // 增加重试机制，解决"第一句话总是失败"的问题
            const MAX_WARMUP_RETRIES = 3;
            let warmupSuccess = false;

            for (let attempt = 1; attempt <= MAX_WARMUP_RETRIES; attempt++) {
                // 每次重试前等待更长时间，给 WASM 绑定更多初始化时间
                const waitTime = attempt * 1000; // 1秒, 2秒, 3秒
                console.log(`🔥 预热 WebLLM 引擎 (尝试 ${attempt}/${MAX_WARMUP_RETRIES})，等待 ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));

                try {
                    await engine.chat.completions.create({
                        messages: [{ role: 'user', content: 'hi' }],
                        max_tokens: 1
                    });
                    console.log('✅ WebLLM 引擎预热成功');
                    // 预热后重置聊天状态，清除 KV Cache，避免影响后续对话
                    await engine.resetChat();
                    warmupSuccess = true;
                    break; // 成功则退出重试循环
                } catch (warmupError) {
                    console.warn(`⚠️ WebLLM 预热失败 (尝试 ${attempt}/${MAX_WARMUP_RETRIES}):`, warmupError);
                    if (attempt === MAX_WARMUP_RETRIES) {
                        console.warn('⚠️ 所有预热尝试均失败，但引擎仍可能可用');
                    }
                }
            }

            console.log(`🏁 WebLLM 初始化完成，预热状态: ${warmupSuccess ? '成功' : '失败但继续'}`);

            // 释放初始化锁
            webllmInitLockRef.current = false;
            console.log('🔓 WebLLM 初始化锁已释放');

            setState(prev => ({
                ...prev,
                webllmLoading: false,
                webllmReady: true,
                webllmProgress: null,
                selectedModel: targetModel
            }));

            // 刷新缓存列表以便 UI 立即显示已下载状态
            setTimeout(async () => {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    const webllmCaches = cacheNames.filter(name =>
                        name.includes('webllm') || name.includes('mlc')
                    );
                    setState(prev => ({ ...prev, webllmCachedModels: webllmCaches }));
                }
            }, 100);
        } catch (error) {
            console.error('WebLLM 初始化失败:', error);
            // 释放初始化锁
            webllmInitLockRef.current = false;
            console.log('🔓 WebLLM 初始化锁已释放（失败）');

            setState(prev => ({
                ...prev,
                webllmLoading: false,
                webllmReady: false,
                webllmProgress: null,
                error: error instanceof Error ? error.message : '初始化失败'
            }));
        }
    }, [state.selectedModel]);

    // 刷新 WebLLM 缓存列表
    const refreshWebLLMCache = useCallback(async () => {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                const webllmCaches = cacheNames.filter(name =>
                    name.includes('webllm') || name.includes('mlc')
                );
                setState(prev => ({ ...prev, webllmCachedModels: webllmCaches }));
            }
        } catch (e) {
            console.warn('无法读取缓存:', e);
        }
    }, []);

    // 删除 WebLLM 模型缓存
    const deleteWebLLMModel = useCallback(async (modelId: string) => {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    if (name.includes(modelId) || name.includes('webllm')) {
                        await caches.delete(name);
                    }
                }
                await refreshWebLLMCache();
            }
        } catch (e) {
            console.error('删除缓存失败:', e);
        }
    }, [refreshWebLLMCache]);

    // 清理所有 WebLLM 缓存
    const clearAllWebLLMCache = useCallback(async () => {
        try {
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const name of cacheNames) {
                    if (name.includes('webllm') || name.includes('mlc') || name.includes('wasm')) {
                        await caches.delete(name);
                        console.log('🗑️ 删除缓存:', name);
                    }
                }
                // 同时清理 IndexedDB
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name && (db.name.includes('webllm') || db.name.includes('mlc'))) {
                        indexedDB.deleteDatabase(db.name);
                        console.log('🗑️ 删除 IndexedDB:', db.name);
                    }
                }
                setState(prev => ({ ...prev, webllmCachedModels: [], webllmReady: false }));
                webllmEngineRef.current = null;
                console.log('✅ WebLLM 缓存已清理');
            }
        } catch (e) {
            console.error('清理缓存失败:', e);
        }
    }, []);

    // 更新 Ollama 配置
    const updateOllamaConfig = useCallback((config: Partial<OllamaConfig>) => {
        setState(prev => {
            const newConfig = { ...prev.ollamaConfig, ...config };
            localStorage.setItem(STORAGE_KEYS.OLLAMA, JSON.stringify(newConfig));
            return { ...prev, ollamaConfig: newConfig };
        });
    }, []);

    // 刷新 Ollama 状态
    const refreshOllamaStatus = useCallback(async () => {
        const { host, port } = state.ollamaConfig;
        const baseUrl = `http://${host}:${port}`;

        try {
            const response = await fetch(`${baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                setState(prev => ({
                    ...prev,
                    ollamaAvailable: true,
                    ollamaModels: models.map((m: any) => ({
                        name: m.name,
                        size: m.size || 0,
                        digest: m.digest,
                        modified_at: m.modified_at,
                        formattedSize: formatSize(m.size)
                    }))
                }));
            } else {
                setState(prev => ({ ...prev, ollamaAvailable: false, ollamaModels: [] }));
            }
        } catch {
            setState(prev => ({ ...prev, ollamaAvailable: false, ollamaModels: [] }));
        }
    }, [state.ollamaConfig]);

    // Ollama 配置改变时自动刷新状态
    useEffect(() => {
        if (state.currentEngine === 'ollama') {
            refreshOllamaStatus();
        }
    }, [state.ollamaConfig.host, state.ollamaConfig.port]);

    // 更新 Cloud 配置
    const updateCloudConfig = useCallback((config: Partial<CloudConfig>) => {
        setState(prev => {
            const newConfig = { ...prev.cloudConfig, ...config };
            localStorage.setItem(STORAGE_KEYS.CLOUD, JSON.stringify(newConfig));

            // 更新引擎实例
            if (openaiEngineRef.current) {
                openaiEngineRef.current.updateConfig(newConfig);
            }

            return { ...prev, cloudConfig: newConfig, cloudApiStatus: 'untested' };
        });
    }, []);

    // 测试 Cloud API
    const testCloudApi = useCallback(async () => {
        if (!openaiEngineRef.current) {
            openaiEngineRef.current = new OpenAIEngine(state.cloudConfig);
        }

        const result = await openaiEngineRef.current.testConnection();
        setState(prev => ({
            ...prev,
            cloudApiStatus: result ? 'success' : 'error'
        }));
        return result;
    }, [state.cloudConfig]);

    // 获取当前引擎实例
    const getEngine = useCallback(() => {
        switch (state.currentEngine) {
            case 'webllm':
                return webllmEngineRef.current;
            case 'openai':
                if (!openaiEngineRef.current) {
                    openaiEngineRef.current = new OpenAIEngine(state.cloudConfig);
                }
                return openaiEngineRef.current;
            default:
                return null;
        }
    }, [state.currentEngine, state.cloudConfig]);

    // 报告错误
    const reportError = useCallback((errorMessage: string) => {
        setState(prev => ({
            ...prev,
            webllmReady: false,
            webllmLoading: false,
            error: errorMessage
        }));
    }, []);

    // 初始化
    useEffect(() => {
        const init = async () => {
            await refreshOllamaStatus();
            await refreshWebLLMCache();
            setState(prev => ({ ...prev, isLoading: false }));
        };
        init();
    }, []);

    // 引擎切换时自动初始化
    useEffect(() => {
        const initEngine = async () => {
            switch (state.currentEngine) {
                case 'webllm':
                    // WebLLM: 如果未就绪且有选中模型，则初始化
                    if (!state.webllmReady && state.selectedModel) {
                        await initWebLLM(state.selectedModel);
                    }
                    break;
                case 'ollama':
                    // Ollama: 刷新状态（已在初始化时完成）
                    break;
                case 'openai':
                    // Cloud API: 创建引擎实例
                    if (!openaiEngineRef.current && state.cloudConfig.apiKey) {
                        try {
                            openaiEngineRef.current = new OpenAIEngine(state.cloudConfig);
                            console.log('✅ Cloud API 引擎已创建');
                        } catch (error) {
                            console.error('❌ Cloud API 引擎创建失败:', error);
                        }
                    }
                    break;
            }
        };
        initEngine();
    }, [state.currentEngine, state.selectedModel, state.webllmReady, state.cloudConfig.apiKey, initWebLLM]);

    return {
        ...state,
        setEngine,
        selectModel,
        initWebLLM,
        refreshWebLLMCache,
        deleteWebLLMModel,
        clearAllWebLLMCache,
        updateOllamaConfig,
        refreshOllamaStatus,
        updateCloudConfig,
        testCloudApi,
        getEngine,
        reportError
    };
}

// 辅助函数
function formatSize(bytes: number): string {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
}
