/**
 * useSettings Hook
 * 集中管理应用设置状态，支持持久化
 */

import { useState, useEffect, useCallback } from 'react';

// 提示词模板
export interface PromptTemplate {
    id: string;
    name: string;
    content: string;
}

// 预设角色类型
export interface PresetRole {
    id: string;
    nameKey: string;     // 翻译键 - 角色名称
    icon: string;        // Lucide 图标名称
    promptKey: string;   // 翻译键 - 提示词内容
}

// 预设角色列表
export const PRESET_ROLES: PresetRole[] = [
    { id: 'writer', nameKey: 'roles.writer', icon: 'PenTool', promptKey: 'roles.writerPrompt' },
    { id: 'novelist', nameKey: 'roles.novelist', icon: 'BookOpen', promptKey: 'roles.novelistPrompt' },
    { id: 'diary', nameKey: 'roles.diary', icon: 'Book', promptKey: 'roles.diaryPrompt' },
    { id: 'translator', nameKey: 'roles.translator', icon: 'Languages', promptKey: 'roles.translatorPrompt' },
    { id: 'learner', nameKey: 'roles.learner', icon: 'GraduationCap', promptKey: 'roles.learnerPrompt' },
    { id: 'coder', nameKey: 'roles.coder', icon: 'Terminal', promptKey: 'roles.coderPrompt' },
    { id: 'outdoor', nameKey: 'roles.outdoor', icon: 'Tent', promptKey: 'roles.outdoorPrompt' },
    { id: 'psyche', nameKey: 'roles.psyche', icon: 'HeartHandshake', promptKey: 'roles.psychePrompt' },
    { id: 'business', nameKey: 'roles.business', icon: 'Briefcase', promptKey: 'roles.businessPrompt' },
    { id: 'creative', nameKey: 'roles.creative', icon: 'Lightbulb', promptKey: 'roles.creativePrompt' },
    { id: 'health', nameKey: 'roles.health', icon: 'Activity', promptKey: 'roles.healthPrompt' },
    { id: 'chef', nameKey: 'roles.chef', icon: 'Utensils', promptKey: 'roles.chefPrompt' },
];

// 应用设置
export interface AppSettings {
    // 外观
    theme: 'light' | 'dark' | 'tea';
    fontFamily: 'system' | 'serif';
    fontSize: number; // 12-18

    // Ollama 配置
    ollamaBaseUrl: string;
    ollamaEnabled: boolean;

    // AI 策略
    preferredEngine: 'ollama' | 'webllm';
    autoFallback: boolean;

    // 角色设定 - 可编辑的系统提示词（默认使用内置提示词）
    systemPrompt: string;
    promptTemplates: PromptTemplate[];

    // 编辑器偏好
    defaultFormat: 'txt' | 'md';  // 默认文件格式
    smartFormatConversion: boolean;  // 智能格式转换（true: MD转TXT时去标符, false: 1:1转换）
}

// 默认设置
export const DEFAULT_SETTINGS: AppSettings = {
    // 外观
    theme: 'tea',
    fontFamily: 'system',
    fontSize: 17,

    // Ollama 配置
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaEnabled: true,

    // AI 策略 - 默认使用内置 WebLLM 引擎
    preferredEngine: 'webllm',
    autoFallback: true,

    // 角色设定 - 空字符串表示使用内置默认提示词
    systemPrompt: '',
    promptTemplates: [],

    // 编辑器偏好
    defaultFormat: 'md',
    smartFormatConversion: true
};

export interface UseSettingsReturn {
    settings: AppSettings;
    isLoading: boolean;

    // 设置方法
    setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
    setSettings: (updates: Partial<AppSettings>) => Promise<void>;
    resetSettings: () => Promise<void>;

    // 主题快捷方法
    setTheme: (theme: AppSettings['theme']) => Promise<void>;

    // Ollama 快捷方法
    setOllamaUrl: (url: string) => Promise<void>;
    testOllamaConnection: () => Promise<boolean>;

    // 提示词模板方法
    addPromptTemplate: (name: string, content: string) => Promise<void>;
    removePromptTemplate: (id: string) => Promise<void>;
    updatePromptTemplate: (id: string, updates: Partial<PromptTemplate>) => Promise<void>;
}

// 生成唯一 ID
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useSettings(): UseSettingsReturn {
    const [settings, setSettingsState] = useState<AppSettings>(() => {
        // 尝试从缓存读取主题，作为初始状态
        try {
            const cachedTheme = localStorage.getItem('zen-theme-cache');
            if (cachedTheme && ['light', 'dark', 'tea'].includes(cachedTheme)) {
                return { ...DEFAULT_SETTINGS, theme: cachedTheme as any };
            }
        } catch (e) {
            // ignore
        }
        return DEFAULT_SETTINGS;
    });
    const [isLoading, setIsLoading] = useState(true);

    // 加载设置
    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (window.settings) {
                    const stored = await window.settings.get();
                    if (stored) {
                        setSettingsState({ ...DEFAULT_SETTINGS, ...stored });
                        // 同步缓存：确保现有用户的配置也能写入缓存
                        if (stored.theme) {
                            localStorage.setItem('zen-theme-cache', stored.theme as string);
                        }
                    }
                }
            } catch (error) {
                console.error('加载设置失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // 应用主题到 DOM
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings.theme]);

    // 应用字体设置到 DOM
    useEffect(() => {
        document.documentElement.style.setProperty(
            '--font-family-main',
            settings.fontFamily === 'serif'
                ? "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif"
                : "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
        );
        // 文章字体大小独立设置
        document.documentElement.style.setProperty('--article-font-size', `${settings.fontSize}px`);
    }, [settings.fontFamily, settings.fontSize]);

    // 监听其他组件的设置变化（通过自定义事件同步）
    useEffect(() => {
        const handleSettingsChange = (e: CustomEvent<Partial<AppSettings>>) => {
            setSettingsState(prev => ({ ...prev, ...e.detail }));
        };
        window.addEventListener('settings-changed', handleSettingsChange as EventListener);
        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange as EventListener);
        };
    }, []);

    // 设置单个值
    const setSetting = useCallback(async <K extends keyof AppSettings>(
        key: K,
        value: AppSettings[K]
    ) => {
        setSettingsState(prev => ({ ...prev, [key]: value }));

        // 如果是设置主题，同时缓存到 localStorage，确保下次启动时不闪烁
        if (key === 'theme') {
            localStorage.setItem('zen-theme-cache', value as string);
        }

        // 派发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { [key]: value }
        }));

        try {
            if (window.settings) {
                await window.settings.set(key, value);
            }
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }, []);

    // 批量设置
    const setSettings = useCallback(async (updates: Partial<AppSettings>) => {
        setSettingsState(prev => ({ ...prev, ...updates }));
        try {
            if (window.settings) {
                for (const [key, value] of Object.entries(updates)) {
                    await window.settings.set(key, value);
                }
            }
        } catch (error) {
            console.error('保存设置失败:', error);
        }
    }, []);

    // 重置设置
    const resetSettings = useCallback(async () => {
        setSettingsState(DEFAULT_SETTINGS);
        try {
            if (window.settings) {
                await window.settings.reset();
            }
        } catch (error) {
            console.error('重置设置失败:', error);
        }
    }, []);

    // 设置主题
    const setTheme = useCallback(async (theme: AppSettings['theme']) => {
        await setSetting('theme', theme);
    }, [setSetting]);

    // 设置 Ollama URL
    const setOllamaUrl = useCallback(async (url: string) => {
        await setSetting('ollamaBaseUrl', url);
    }, [setSetting]);

    // 测试 Ollama 连接
    const testOllamaConnection = useCallback(async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${settings.ollamaBaseUrl}/api/tags`, {
                signal: controller.signal
            });

            clearTimeout(timeout);
            return response.ok;
        } catch {
            return false;
        }
    }, [settings.ollamaBaseUrl]);

    // 添加提示词模板
    const addPromptTemplate = useCallback(async (name: string, content: string) => {
        if (settings.promptTemplates.length >= 5) {
            console.warn('提示词模板数量已达上限 (5)');
            return;
        }

        const newTemplate: PromptTemplate = {
            id: generateId(),
            name,
            content
        };

        await setSetting('promptTemplates', [...settings.promptTemplates, newTemplate]);
    }, [settings.promptTemplates, setSetting]);

    // 删除提示词模板
    const removePromptTemplate = useCallback(async (id: string) => {
        await setSetting(
            'promptTemplates',
            settings.promptTemplates.filter(t => t.id !== id)
        );
    }, [settings.promptTemplates, setSetting]);

    // 更新提示词模板
    const updatePromptTemplate = useCallback(async (
        id: string,
        updates: Partial<PromptTemplate>
    ) => {
        await setSetting(
            'promptTemplates',
            settings.promptTemplates.map(t =>
                t.id === id ? { ...t, ...updates } : t
            )
        );
    }, [settings.promptTemplates, setSetting]);

    return {
        settings,
        isLoading,
        setSetting,
        setSettings,
        resetSettings,
        setTheme,
        setOllamaUrl,
        testOllamaConnection,
        addPromptTemplate,
        removePromptTemplate,
        updatePromptTemplate
    };
}

export default useSettings;
