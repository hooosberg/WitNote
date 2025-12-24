/**
 * Settings 设置面板组件
 * macOS 风格的全屏设置面板，Ollama-only 架构
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Palette,
    Bot,
    MessageSquare,
    HelpCircle,
    Keyboard,
    Info,
    Sun,
    Moon,
    Coffee,
    Loader2,
    RotateCcw,
    Trash2,
    Check,
    Plus,
    PenTool,
    BookOpen,
    Book,
    Languages,
    GraduationCap,
    Terminal,
    Tent,
    HeartHandshake,
    Briefcase,
    Lightbulb,
    Activity,
    Utensils,
    Star,
    Edit2,
    Gauge,
    LayoutList,
    AlignLeft
} from 'lucide-react';
import { useSettings, AppSettings, PRESET_ROLES } from '../hooks/useSettings';
import { changeLanguage, getCurrentLanguage, LanguageCode } from '../i18n';
import { UseLLMReturn } from '../hooks/useLLM';
import ConfirmDialog from './ConfirmDialog';

import {
    getDefaultSystemPrompt,
    INSTRUCTION_TEMPLATE_STANDARD_ZH,
    INSTRUCTION_TEMPLATE_FULL_ZH,
    INSTRUCTION_TEMPLATE_STANDARD_EN,
    INSTRUCTION_TEMPLATE_FULL_EN
} from '../services/types';
import { UseEngineStoreReturn } from '../store/engineStore';
import { ALL_WEBLLM_MODELS_INFO } from '../engines/webllmModels';

type TabType = 'appearance' | 'ai' | 'persona' | 'shortcuts' | 'about';

const LANGUAGES: { code: LanguageCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '简体中文 (Simplified Chinese)' },
    { code: 'ja', label: '日本語 (Japanese)' },
    { code: 'ko', label: '한국어 (Korean)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'de', label: 'Deutsch (German)' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
];

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    llm?: UseLLMReturn;
    defaultTab?: TabType;
    engineStore: UseEngineStoreReturn;
}

const RoleIcon = ({ name, size = 20, className }: { name: string, size?: number, className?: string }) => {
    const IconMap: Record<string, any> = {
        PenTool, BookOpen, Book, Languages, GraduationCap, Terminal,
        Tent, HeartHandshake, Briefcase, Lightbulb, Activity, Utensils
    };
    const Icon = IconMap[name] || Bot;
    return <Icon size={size} className={className} />;
};

export function Settings({ isOpen, onClose, llm, defaultTab, engineStore }: SettingsProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'appearance');

    // 自定义确认对话框状态
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        details?: string[];
        onConfirm: () => void;
    } | null>(null);

    // 当设置面板打开时，使用defaultTab
    useEffect(() => {
        if (isOpen && defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);
    const {
        settings,
        isLoading,
        setSetting,
        setTheme,
        resetSettings,
        addPromptTemplate,
        removePromptTemplate,
        updatePromptTemplate
    } = useSettings();

    const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
    const [appVersion, setAppVersion] = useState('1.2.1');
    const [isCreatingRole, setIsCreatingRole] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');

    // 提示词等级状态
    const [promptLevel, setPromptLevel] = useState<'lite' | 'standard' | 'full'>('standard');
    const [activeRoleId, setActiveRoleId] = useState<string | null>(null); // 当前选中的预设角色 ID

    // 生成完整提示词
    const generatePrompt = (basePrompt: string, level: 'lite' | 'standard' | 'full') => {
        let suffix = '';
        const lang = currentLang;

        if (lang === 'zh') {
            if (level === 'standard') suffix = INSTRUCTION_TEMPLATE_STANDARD_ZH;
            if (level === 'full') suffix = INSTRUCTION_TEMPLATE_FULL_ZH;
        } else {
            // 英文或其他语言使用英文模板
            if (level === 'standard') suffix = INSTRUCTION_TEMPLATE_STANDARD_EN;
            if (level === 'full') suffix = INSTRUCTION_TEMPLATE_FULL_EN;
        }

        return basePrompt + suffix;
    };

    // 当 Prompt Level 改变且有选中的预设角色时，自动更新提示词
    useEffect(() => {
        if (activeRoleId) {
            const role = PRESET_ROLES.find(r => r.id === activeRoleId);
            if (role) {
                const basePrompt = t(role.promptKey);
                const newPrompt = generatePrompt(basePrompt, promptLevel);
                // 仅当内容确实改变时才更新，避免死循环（虽然 setSetting 是异步的）
                if (settings.systemPrompt !== newPrompt) {
                    setSetting('systemPrompt', newPrompt);
                }
            }
        }
    }, [promptLevel, activeRoleId, currentLang]); // 默认版本号

    // 获取应用版本号
    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const version = await window.app?.getVersion();
                if (version) {
                    setAppVersion(version);
                }
            } catch (error) {
                console.error('Failed to get app version:', error);
            }
        };
        fetchVersion();
    }, []);

    // ESC 关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // 监听语言变化
    useEffect(() => {
        const handleLanguageChange = () => {
            setCurrentLang(getCurrentLanguage());
        };
        i18n.on('languageChanged', handleLanguageChange);
        return () => {
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n]);

    if (!isOpen) return null;

    const handleLanguageChange = (lang: LanguageCode) => {
        changeLanguage(lang);
        setCurrentLang(lang);
    };

    // Tab 内容
    const renderTabContent = () => {
        switch (activeTab) {
            case 'appearance':
                return (
                    <div className="settings-tab-content">
                        {/* 语言选择 - 下拉菜单 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.language')}</h3>
                            <div className="settings-row">
                                <label>{t('settings.languageAuto')}</label>
                                <select
                                    value={currentLang}
                                    onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                                    className="settings-select"
                                    style={{ minWidth: '200px' }}
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 主题选择 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.theme')}</h3>
                            <div className="theme-options">
                                <button
                                    className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun size={24} />
                                    <span>{t('settings.themeLight')}</span>
                                </button>
                                <button
                                    className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon size={24} />
                                    <span>{t('settings.themeDark')}</span>
                                </button>
                                <button
                                    className={`theme-option ${settings.theme === 'tea' ? 'active' : ''}`}
                                    onClick={() => setTheme('tea')}
                                >
                                    <Coffee size={24} />
                                    <span>{t('settings.themeTea')}</span>
                                </button>
                            </div>
                        </div>

                        {/* 字体选择 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.font')}</h3>
                            <div className="settings-row">
                                <label>{t('settings.fontFamily')}</label>
                                <select
                                    value={settings.fontFamily}
                                    onChange={(e) => setSetting('fontFamily', e.target.value as AppSettings['fontFamily'])}
                                    className="settings-select"
                                >
                                    <option value="system">{t('settings.fontSystem')}</option>
                                    <option value="serif">{t('settings.fontSerif')}</option>
                                </select>
                            </div>
                            <div className="settings-row">
                                <label>{t('settings.fontSize')}</label>
                                <div className="font-size-control">
                                    <input
                                        type="range"
                                        min="12"
                                        max="18"
                                        value={settings.fontSize}
                                        onChange={(e) => setSetting('fontSize', parseInt(e.target.value))}
                                        className="settings-slider"
                                    />
                                    <span className="font-size-value">{settings.fontSize}px</span>
                                </div>
                            </div>
                        </div>

                        {/* 编辑器偏好 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.editor')}</h3>
                            <div className="settings-row">
                                <label>{t('settings.defaultFormat')}</label>
                                <select
                                    value={settings.defaultFormat}
                                    onChange={(e) => setSetting('defaultFormat', e.target.value as 'txt' | 'md')}
                                    className="settings-select"
                                >
                                    <option value="md">Markdown (.md)</option>
                                    <option value="txt">{t('editor.formatTxt')} (.txt)</option>
                                </select>
                            </div>
                            <div className="settings-row">
                                <label>{t('settings.smartConversion')}</label>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.smartFormatConversion}
                                        onChange={(e) => setSetting('smartFormatConversion', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <p className="settings-hint">
                                {t('settings.smartConversionHint')}
                            </p>
                        </div>
                    </div>
                );

            case 'ai':
                return (
                    <div className="settings-tab-content">
                        {/* 引擎选择器 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title" style={{ textAlign: 'center', marginBottom: 0 }}>{t('settings.selectAiEngine')}</h3>
                            <div className="engine-selector-container">
                                <div className="engine-selector-line" />

                                {/* WebLLM - 本地内置 */}
                                <button
                                    className={`engine-selector-item ${engineStore.currentEngine === 'webllm' ? 'active' : ''}`}
                                    onClick={() => {
                                        engineStore.setEngine('webllm')
                                        // 自动初始化：只有在非首次使用时才自动加载
                                        const savedModel = localStorage.getItem('zen-selected-webllm-model');
                                        const targetModel = savedModel || ALL_WEBLLM_MODELS_INFO[0]?.model_id;

                                        if (!engineStore.webllmReady && !engineStore.webllmLoading && !engineStore.webllmFirstTimeSetup && targetModel) {
                                            engineStore.initWebLLM(targetModel)
                                        }
                                    }}
                                    title="本地内置模型"
                                >
                                    <div className="engine-circle"><Bot size={24} /></div>
                                    <span className="engine-label">{t('chat.engineWebLLM')}</span>
                                </button>

                                {/* Ollama */}
                                <button
                                    className={`engine-selector-item ${engineStore.currentEngine === 'ollama' ? 'active' : ''}`}
                                    onClick={() => engineStore.setEngine('ollama')}
                                >
                                    <div className="engine-circle">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"></path>
                                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0 5z"></path>
                                            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                                            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                                        </svg>
                                    </div>
                                    <span className="engine-label">{t('chat.engineOllama')}</span>
                                </button>

                                {/* Cloud */}
                                <button
                                    className={`engine-selector-item ${engineStore.currentEngine === 'openai' ? 'active' : ''}`}
                                    onClick={() => engineStore.setEngine('openai')}
                                >
                                    <div className="engine-circle">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.5 19c0-1.7-1.3-3-3-3h-11"></path>
                                            <path d="M17.5 19a3.5 3.5 0 1 0 0-7h-1"></path>
                                            <path d="M16.5 12a4.5 4.5 0 1 0-9 0"></path>
                                        </svg>
                                    </div>
                                    <span className="engine-label">{t('chat.engineCloud')}</span>
                                </button>
                            </div>
                        </div>

                        {/* WebLLM 内容 */}
                        {engineStore.currentEngine === 'webllm' && (
                            <div className="settings-section fade-in">
                                <div className="settings-section-header">
                                    <h3 className="settings-section-title">{t('chat.builtInWebLLMModels')}</h3>
                                </div>
                                <div className="recommended-models" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {ALL_WEBLLM_MODELS_INFO.map(modelInfo => {
                                        const isSelected = engineStore.selectedModel === modelInfo.model_id;
                                        const isLoading = isSelected && engineStore.webllmLoading;
                                        const isReady = isSelected && engineStore.webllmReady;
                                        const isCached = engineStore.webllmCachedModels.includes(modelInfo.model_id);
                                        const progressVal = engineStore.webllmProgress ? Math.round(engineStore.webllmProgress.progress * 100) : 0;

                                        return (
                                            <div key={modelInfo.model_id} className="model-card" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                background: 'var(--bg-card)',
                                                borderRadius: '10px'
                                            }}>
                                                {/* 左侧：标题和描述 */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 600 }}>{modelInfo.displayName}</span>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px',
                                                            background: 'var(--border-color)',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            {modelInfo.size}
                                                        </span>
                                                        {modelInfo.isBuiltIn && (
                                                            <span className="builtin-tag">{t('chat.builtIn')}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {modelInfo.description}
                                                    </div>
                                                    {/* 进度条 */}
                                                    {isLoading && (
                                                        <div style={{ marginTop: '8px' }}>
                                                            <div style={{
                                                                height: '4px',
                                                                background: 'var(--border-color)',
                                                                borderRadius: '2px',
                                                                overflow: 'hidden',
                                                                minWidth: '200px'
                                                            }}>
                                                                <div style={{
                                                                    width: `${progressVal}%`,
                                                                    minWidth: progressVal > 0 ? '4px' : '0',
                                                                    height: '100%',
                                                                    background: 'var(--accent)',
                                                                    transition: 'width 0.3s ease'
                                                                }} />
                                                            </div>
                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: 'var(--text-secondary)',
                                                                marginTop: '4px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: '300px'
                                                            }}>
                                                                {progressVal}% {engineStore.webllmProgress?.text || '加载中...'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 右侧：按钮 */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 size={18} className="spin" style={{ color: 'var(--accent)' }} />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDialog({
                                                                        isOpen: true,
                                                                        title: t('chat.confirmCancelDownloadTitle'),
                                                                        message: t('chat.confirmCancelDownloadMessage'),
                                                                        onConfirm: () => {
                                                                            engineStore?.resetWebLLMSetup();
                                                                            setConfirmDialog(null);
                                                                        }
                                                                    });
                                                                }}
                                                                title="取消下载"
                                                                style={{
                                                                    padding: '6px',
                                                                    borderRadius: '50%',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    color: 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.color = '#ff453a';
                                                                    e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                                    e.currentTarget.style.background = 'transparent';
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : isReady && isSelected ? (
                                                        <button
                                                            className="download-btn"
                                                            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                                                            disabled
                                                        >
                                                            <Check size={16} style={{ marginRight: '4px' }} /> {t('chat.inUse')}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="download-btn"
                                                            onClick={() => engineStore.initWebLLM(modelInfo.model_id)}
                                                            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                                                        >
                                                            {isCached ? t('chat.use') : t('chat.download')}
                                                        </button>
                                                    )}

                                                    {/* 清除/删除缓存按钮 */}
                                                    {(isCached || (isReady && isSelected)) && !isLoading && (
                                                        <button
                                                            className="icon-btn delete-model-btn"
                                                            title={modelInfo.isBuiltIn ? "清除缓存" : "删除缓存"}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const confirmMsg = modelInfo.isBuiltIn
                                                                    ? t('chat.confirmClearCacheMessage', { name: modelInfo.displayName })
                                                                    : t('chat.confirmDeleteCacheMessage', { name: modelInfo.displayName });

                                                                setConfirmDialog({
                                                                    isOpen: true,
                                                                    title: modelInfo.isBuiltIn ? t('chat.confirmClearCacheTitle') : t('chat.confirmDeleteCacheTitle'),
                                                                    message: confirmMsg,
                                                                    onConfirm: async () => {
                                                                        setConfirmDialog(null);
                                                                        if (modelInfo.isBuiltIn) {
                                                                            // 内置模型：彻底清除所有缓存（类似 Chrome DevTools 的 Clear site data）
                                                                            try {
                                                                                console.log('🧹 开始清除所有站点数据...');

                                                                                // 1. 删除所有 IndexedDB 数据库（不过滤）
                                                                                const dbs = await window.indexedDB.databases();
                                                                                console.log('📦 发现数据库:', dbs.map(db => db.name));

                                                                                const deletePromises = dbs.map(db => new Promise<void>((resolve) => {
                                                                                    if (db.name) {
                                                                                        console.log('🗑️ 删除:', db.name);
                                                                                        const req = window.indexedDB.deleteDatabase(db.name);
                                                                                        req.onsuccess = () => {
                                                                                            console.log('✅', db.name);
                                                                                            resolve();
                                                                                        };
                                                                                        req.onerror = (e) => {
                                                                                            console.error('❌', db.name, e);
                                                                                            resolve(); // 继续删除其他
                                                                                        };
                                                                                        req.onblocked = () => {
                                                                                            console.warn('⚠️ 阻塞:', db.name);
                                                                                            resolve();
                                                                                        };
                                                                                    } else {
                                                                                        resolve();
                                                                                    }
                                                                                }));

                                                                                await Promise.all(deletePromises);
                                                                                console.log('✅ 所有 IndexedDB 已清除');

                                                                                // 2. 清除所有 Cache Storage
                                                                                const cacheNames = await caches.keys();
                                                                                console.log('📦 发现 Cache:', cacheNames);
                                                                                await Promise.all(cacheNames.map(name => caches.delete(name)));
                                                                                console.log('✅ 所有 Cache 已清除');

                                                                                // 3. 清除 localStorage 相关标记
                                                                                localStorage.removeItem('webllm-setup-completed');
                                                                                localStorage.removeItem('zen-selected-webllm-model');
                                                                                console.log('✅ localStorage 已清理');

                                                                                // 4. 刷新页面
                                                                                console.log('🔄 准备刷新页面');
                                                                                alert(`已清除 ${dbs.length} 个数据库和 ${cacheNames.length} 个缓存，页面即将刷新`);
                                                                                window.location.reload();
                                                                            } catch (error) {
                                                                                console.error('❌ 清除失败:', error);
                                                                                alert('清除失败: ' + error);
                                                                            }
                                                                        } else {
                                                                            // 非内置模型：使用标准删除方法
                                                                            engineStore.deleteWebLLMModel(modelInfo.model_id);
                                                                        }
                                                                    }
                                                                });
                                                            }}
                                                            style={{
                                                                padding: '8px',
                                                                color: 'var(--text-secondary)',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.color = '#ff453a';
                                                                e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                                                e.currentTarget.style.background = 'transparent';
                                                            }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ollama 内容 */}
                        {engineStore.currentEngine === 'ollama' && (
                            <div className="settings-section fade-in">
                                <div className="settings-section-header">
                                    <h3 className="settings-section-title">{t('settings.externalOllama')}</h3>
                                    <button
                                        className={`status-btn ${engineStore.ollamaAvailable ? 'connected' : 'error'}`}
                                        onClick={() => engineStore.refreshOllamaStatus()}
                                        title={t('settings.clickToTest')}
                                    >
                                        <span className="status-indicator" />
                                        <span className="status-text">{engineStore.ollamaAvailable ? t('settings.connected') : t('settings.connectionFailed')}</span>
                                        <span className="status-action">{t('settings.testConnection')}</span>
                                    </button>
                                </div>
                                <p className="settings-hint" style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {t('settings.pleaseEnsureOllamaRunning')}
                                </p>

                                {/* 配置卡片 */}
                                <div style={{
                                    marginTop: '16px',
                                    padding: '16px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>{t('settings.serverAddress')}</label>
                                            <input
                                                type="text"
                                                className="settings-input"
                                                value={engineStore.ollamaConfig.host}
                                                onChange={(e) => engineStore.updateOllamaConfig({ host: e.target.value })}
                                                placeholder="127.0.0.1"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>{t('settings.port')}</label>
                                            <input
                                                type="number"
                                                className="settings-input"
                                                value={engineStore.ollamaConfig.port}
                                                onChange={(e) => engineStore.updateOllamaConfig({ port: parseInt(e.target.value) || 11434 })}
                                                placeholder="11434"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {llm && llm.status === 'ready' && (
                                    <>
                                        <div style={{ marginTop: '24px', marginBottom: '12px' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{t('settings.installedModels')}</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {llm.ollamaModels.length === 0 ? (
                                                <div className="empty-state">{t('settings.noModelsInstalled')}</div>
                                            ) : (
                                                llm.ollamaModels.map(model => (
                                                    <div key={model.name} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '12px 16px',
                                                        background: 'var(--bg-card)',
                                                        borderRadius: '10px'
                                                    }}>
                                                        <div>
                                                            <span style={{ fontWeight: 600 }}>{model.name}</span>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                                {model.formattedSize}
                                                            </div>
                                                        </div>
                                                        {model.name !== engineStore.selectedModel ? (
                                                            <button
                                                                className="download-btn"
                                                                onClick={() => engineStore.selectModel(model.name)}
                                                            >
                                                                {t('settings.useModel')}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="download-btn"
                                                                disabled
                                                            >
                                                                <Check size={16} style={{ marginRight: '4px' }} /> {t('settings.inUse')}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                        }

                        {/* Cloud 内容 */}
                        {
                            engineStore.currentEngine === 'openai' && (
                                <div className="settings-section fade-in">
                                    <div className="settings-section-header">
                                        <h3 className="settings-section-title">{t('settings.cloudApi')}</h3>
                                        <button
                                            className={`status-btn ${engineStore.cloudApiStatus === 'success' ? 'connected' : engineStore.cloudApiStatus === 'error' ? 'error' : 'untested'}`}
                                            onClick={() => engineStore.testCloudApi()}
                                            title={t('settings.clickToTest')}
                                        >
                                            <span className="status-indicator" />
                                            <span className="status-text">
                                                {engineStore.cloudApiStatus === 'success' ? t('settings.connected') :
                                                    engineStore.cloudApiStatus === 'error' ? t('settings.connectionFailed') : t('settings.notTested')}
                                            </span>
                                            <span className="status-action">{t('settings.testConnection')}</span>
                                        </button>
                                    </div>

                                    {/* 支持平台列表 */}
                                    <p className="settings-hint" style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {t('settings.supportedPlatforms')}
                                    </p>

                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>API Key</label>
                                                <input
                                                    type="password"
                                                    value={engineStore.cloudConfig.apiKey}
                                                    onChange={(e) => engineStore.updateCloudConfig({ apiKey: e.target.value })}
                                                    className="settings-input"
                                                    placeholder="sk-..."
                                                    style={{ width: '100%', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>Base URL</label>
                                                <input
                                                    type="text"
                                                    value={engineStore.cloudConfig.baseUrl}
                                                    onChange={(e) => engineStore.updateCloudConfig({ baseUrl: e.target.value })}
                                                    className="settings-input"
                                                    placeholder="https://api.openai.com/v1"
                                                    style={{ width: '100%', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>{t('settings.modelNameLabel')}</label>
                                                <input
                                                    type="text"
                                                    value={engineStore.cloudConfig.modelName}
                                                    onChange={(e) => engineStore.updateCloudConfig({ modelName: e.target.value })}
                                                    className="settings-input"
                                                    placeholder="gpt-4o"
                                                    style={{ width: '100%', fontFamily: 'monospace' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 配置指南 */}
                                    <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <strong style={{ fontSize: '12px' }}>📖 {t('settings.configGuide')}</strong>
                                        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8', fontSize: '12px' }}>
                                            <li><a href="https://platform.openai.com/docs" target="_blank" rel="noreferrer">OpenAI 文档</a></li>
                                            <li><a href="https://ai.google.dev/docs" target="_blank" rel="noreferrer">Google Gemini 文档</a> (Base URL: generativelanguage.googleapis.com/v1beta/openai/)</li>
                                            <li><a href="https://api-docs.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek 文档</a></li>
                                        </ul>
                                    </div>

                                    <p className="settings-hint" style={{ fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <HelpCircle size={12} /> {t('settings.apiKeyLocalNotice')}
                                    </p>
                                </div>
                            )
                        }
                    </div >
                );

            case 'persona':
                // 根据当前语言和等级获取默认提示词
                const defaultPromptForLang = getDefaultSystemPrompt(currentLang, promptLevel);
                // 获取当前显示的提示词：如果用户设置了则显示用户的，否则显示内置默认
                const displayPrompt = settings.systemPrompt || defaultPromptForLang;
                const isCustomized = settings.systemPrompt && settings.systemPrompt.trim() !== '';

                return (
                    <div className="settings-tab-content">
                        {/* 系统提示词编辑区 */}
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <h3 className="settings-section-title" style={{ margin: 0 }}>{t('settings.defaultPrompt')}</h3>

                                    {/* 提示词长度切换器 */}
                                    <div className="prompt-level-toggle" style={{ display: 'flex', background: 'var(--bg-sidebar)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {[
                                            { id: 'lite', icon: AlignLeft, label: t('settings.promptLevelLite') },
                                            { id: 'standard', icon: LayoutList, label: t('settings.promptLevelStandard') },
                                            { id: 'full', icon: Gauge, label: t('settings.promptLevelFull') }
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            const isActive = promptLevel === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setPromptLevel(item.id as any)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        background: isActive ? 'var(--bg-card)' : 'transparent',
                                                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                        boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        fontWeight: isActive ? 500 : 400,
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={item.label}
                                                >
                                                    <Icon size={12} />
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isCustomized && (
                                    <button
                                        className="restore-default-btn"
                                        onClick={() => {
                                            setSetting('systemPrompt', '');
                                            setActiveRoleId(null);
                                        }}
                                    >
                                        <RotateCcw size={14} />
                                        {t('settings.restoreDefault')}
                                    </button>
                                )}
                            </div>
                            <p className="settings-hint">
                                {t('settings.defaultPromptHint')}
                            </p>
                            <textarea
                                value={displayPrompt}
                                onChange={(e) => setSetting('systemPrompt', e.target.value)}
                                className="settings-textarea"
                                rows={8}
                            />
                            {!isCustomized && (
                                <p className="settings-hint" style={{ marginTop: '8px' }}>
                                    {t('settings.customPromptEmpty')}
                                </p>
                            )}
                        </div>

                        {/* 快捷角色选择区 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.quickRoles')}</h3>
                            <p className="settings-hint">{t('settings.quickRolesHint')}</p>

                            {/* 预设角色按钮网格 */}
                            <div className="role-buttons-grid">
                                {PRESET_ROLES.map(role => (
                                    <button
                                        key={role.id}
                                        className={`role-btn ${activeRoleId === role.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveRoleId(role.id);
                                            const newPrompt = generatePrompt(t(role.promptKey), promptLevel);
                                            setSetting('systemPrompt', newPrompt);
                                        }}
                                        title={t(role.promptKey)}
                                        style={activeRoleId === role.id ? { borderColor: 'var(--accent-color)', background: 'var(--bg-active)' } : {}}
                                    >
                                        <div className="role-icon-wrapper">
                                            <RoleIcon name={role.icon} size={20} />
                                        </div>
                                        <span className="role-name">{t(role.nameKey)}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 用户自定义角色 */}
                            {settings.promptTemplates.length > 0 && (
                                <>
                                    <h4 className="settings-subtitle">{t('settings.customRoles')}</h4>
                                    <div className="role-buttons-grid">
                                        {settings.promptTemplates.map(template => (
                                            <div key={template.id} className="role-btn-wrapper">
                                                {editingRoleId === template.id ? (
                                                    <div className="role-edit-input-wrapper">
                                                        <input
                                                            type="text"
                                                            value={editingRoleName}
                                                            onChange={(e) => setEditingRoleName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    if (editingRoleName.trim()) {
                                                                        updatePromptTemplate(template.id, { name: editingRoleName.trim() });
                                                                        setEditingRoleId(null);
                                                                    }
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingRoleId(null);
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (editingRoleName.trim()) {
                                                                    updatePromptTemplate(template.id, { name: editingRoleName.trim() });
                                                                }
                                                                setEditingRoleId(null);
                                                            }}
                                                            autoFocus
                                                            className="role-edit-input"
                                                        />
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="role-btn custom"
                                                        onClick={() => setSetting('systemPrompt', template.content)}
                                                        title={template.content}
                                                    >
                                                        <div className="role-icon-wrapper text-yellow-500">
                                                            <Star size={20} fill="var(--warning-color, #f59e0b)" color="var(--warning-color, #f59e0b)" fillOpacity={0.2} />
                                                        </div>
                                                        <span className="role-name">{template.name}</span>

                                                        <div className="role-actions">
                                                            <button
                                                                className="role-action-btn edit"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingRoleId(template.id);
                                                                    setEditingRoleName(template.name);
                                                                }}
                                                                title={t('dialog.rename')}
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                className="role-action-btn delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDialog({
                                                                        isOpen: true,
                                                                        title: t('dialog.delete'),
                                                                        message: t('dialog.deleteConfirm') + ` "${template.name}"?`,
                                                                        onConfirm: () => {
                                                                            removePromptTemplate(template.id);
                                                                            setConfirmDialog(null);
                                                                        }
                                                                    });
                                                                }}
                                                                title={t('dialog.delete')}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* 保存当前为自定义角色按钮 - 始终显示 */}
                            {settings.promptTemplates.length < 5 && (
                                <div className="save-role-container">
                                    {isCreatingRole ? (
                                        <div className="save-role-input-group">
                                            <input
                                                type="text"
                                                value={newRoleName}
                                                onChange={(e) => setNewRoleName(e.target.value)}
                                                placeholder={t('settings.saveRolePrompt')}
                                                className="save-role-input"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newRoleName.trim()) {
                                                        addPromptTemplate(newRoleName.trim(), displayPrompt);
                                                        setIsCreatingRole(false);
                                                        setNewRoleName('');
                                                    } else if (e.key === 'Escape') {
                                                        setIsCreatingRole(false);
                                                        setNewRoleName('');
                                                    }
                                                }}
                                            />
                                            <button
                                                className="save-role-confirm-btn"
                                                onClick={() => {
                                                    if (newRoleName.trim()) {
                                                        addPromptTemplate(newRoleName.trim(), displayPrompt);
                                                        setIsCreatingRole(false);
                                                        setNewRoleName('');
                                                    }
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                className="save-role-cancel-btn"
                                                onClick={() => {
                                                    setIsCreatingRole(false);
                                                    setNewRoleName('');
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="save-custom-role-btn"
                                            onClick={() => {
                                                setIsCreatingRole(true);
                                            }}
                                        >
                                            <Plus size={16} />
                                            {t('settings.saveAsCustomRole')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'shortcuts':
                return (
                    <div className="settings-tab-content shortcuts-content">
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('shortcuts.title')}</h3>
                            <p className="settings-hint" style={{ marginBottom: '20px' }}>
                                {t('shortcuts.description')}
                            </p>
                        </div>

                        {/* 通用快捷键 */}
                        <div className="settings-section">
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                                {t('shortcuts.general')}
                            </h4>
                            <div className="shortcut-list">
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.newArticle')}</span>
                                    <kbd className="shortcut-key">Cmd+N</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.newFolder')}</span>
                                    <kbd className="shortcut-key">Cmd+Shift+N</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.openSettings')}</span>
                                    <kbd className="shortcut-key">Cmd+,</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.focusMode')}</span>
                                    <kbd className="shortcut-key">Cmd+Shift+F</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.closeWindow')}</span>
                                    <kbd className="shortcut-key">Cmd+W</kbd>
                                </div>
                            </div>
                        </div>

                        {/* 编辑器快捷键 */}
                        <div className="settings-section">
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                                {t('shortcuts.editing')}
                            </h4>
                            <div className="shortcut-list">
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.undo')}</span>
                                    <kbd className="shortcut-key">Cmd+Z</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.redo')}</span>
                                    <kbd className="shortcut-key">Cmd+Shift+Z</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.cut')}</span>
                                    <kbd className="shortcut-key">Cmd+X</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.copy')}</span>
                                    <kbd className="shortcut-key">Cmd+C</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.paste')}</span>
                                    <kbd className="shortcut-key">Cmd+V</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.selectAll')}</span>
                                    <kbd className="shortcut-key">Cmd+A</kbd>
                                </div>
                            </div>
                        </div>

                        {/* 视图快捷键 */}
                        <div className="settings-section">
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                                {t('shortcuts.view')}
                            </h4>
                            <div className="shortcut-list">
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.refresh')}</span>
                                    <kbd className="shortcut-key">Cmd+R</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.devTools')}</span>
                                    <kbd className="shortcut-key">Cmd+Alt+I</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.actualSize')}</span>
                                    <kbd className="shortcut-key">Cmd+0</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.zoomIn')}</span>
                                    <kbd className="shortcut-key">Cmd++</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.zoomOut')}</span>
                                    <kbd className="shortcut-key">Cmd+-</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span className="shortcut-desc">{t('shortcuts.fullscreen')}</span>
                                    <kbd className="shortcut-key">Ctrl+Cmd+F</kbd>
                                </div>
                            </div>
                        </div>

                        {/* Windows 说明 */}
                        {window.platform?.isWindows && (
                            <div className="settings-section">
                                <p className="settings-hint" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    {t('shortcuts.windowsHint')}
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 'about':
                return (
                    <div className="settings-tab-content guide-content">
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.aboutTitle')}</h3>
                            <div className="guide-intro">
                                <p className="guide-tagline">{t('guide.tagline')}</p>
                                <p className="guide-description">{t('guide.description')}</p>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.philosophy')}</h3>
                            <ul className="guide-list">
                                <li><strong>{t('guide.philosophySmart')}</strong> {t('guide.philosophySmartDesc')}</li>
                                <li><strong>{t('guide.philosophySimple')}</strong> {t('guide.philosophySimpleDesc')}</li>
                                <li><strong>{t('guide.philosophySecure')}</strong> {t('guide.philosophySecureDesc')}</li>
                            </ul>
                        </div>

                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.quickStart')}</h3>
                            <div className="guide-steps">
                                <div className="guide-step">
                                    <span className="step-number">1</span>
                                    <div className="step-content">
                                        <strong>{t('guide.step1Title')}</strong>
                                        <p>{t('guide.step1Desc')}</p>
                                    </div>
                                </div>
                                <div className="guide-step">
                                    <span className="step-number">2</span>
                                    <div className="step-content">
                                        <strong>{t('guide.step2Title')}</strong>
                                        <p>{t('guide.step2Desc')}</p>
                                    </div>
                                </div>
                                <div className="guide-step">
                                    <span className="step-number">3</span>
                                    <div className="step-content">
                                        <strong>{t('guide.step3Title')}</strong>
                                        <p>{t('guide.step3Desc')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.developer')}</h3>
                            <p className="guide-developer">
                                {t('guide.developedBy')} <strong>hooosberg</strong>
                            </p>
                            <p className="guide-contact">
                                📧 <a href="mailto:zikedece@proton.me">zikedece@proton.me</a>
                            </p>
                            <p className="guide-contact">
                                🔗 <a href="https://github.com/hooosberg/WitNote" target="_blank" rel="noopener noreferrer">GitHub</a>
                            </p>
                            <p className="guide-version">{t('settings.version')} {appVersion} · 2025</p>
                            <p className="guide-license">
                                {t('guide.license')} <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>
                            </p>
                        </div>

                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.credits.title')}</h3>
                            <div className="guide-credits">
                                <p className="credit-item">
                                    <strong>WebLLM</strong> - {t('settings.credits.webllmDesc')}<br />
                                    <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noopener noreferrer">github.com/mlc-ai/web-llm</a><br />
                                    <span className="license-tag">Apache License 2.0</span>
                                </p>
                                <p className="credit-item">
                                    <strong>Ollama</strong> - {t('settings.credits.ollamaDesc')}<br />
                                    <a href="https://github.com/ollama/ollama" target="_blank" rel="noopener noreferrer">github.com/ollama/ollama</a><br />
                                    <span className="license-tag">MIT License</span>
                                </p>
                                <p className="credit-item">
                                    <strong>Qwen2.5</strong> - {t('settings.credits.qwenDesc')}<br />
                                    <a href="https://github.com/QwenLM/Qwen2.5" target="_blank" rel="noopener noreferrer">github.com/QwenLM/Qwen2.5</a><br />
                                    <span className="license-tag">Apache License 2.0</span>
                                </p>
                                <p className="credit-note">
                                    {t('settings.credits.note')}
                                </p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>{t('settings.title')}</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="settings-body">
                    <div className="settings-tabs">
                        <button
                            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('appearance')}
                        >
                            <Palette size={18} />
                            <span>{t('settings.appearance')}</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            <Bot size={18} />
                            <span>{t('settings.aiEngine')}</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'persona' ? 'active' : ''}`}
                            onClick={() => setActiveTab('persona')}
                        >
                            <MessageSquare size={18} />
                            <span>{t('settings.persona')}</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('shortcuts')}
                        >
                            <Keyboard size={18} />
                            <span>{t('settings.shortcuts')}</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'about' ? 'active' : ''}`}
                            onClick={() => setActiveTab('about')}
                        >
                            <Info size={18} />
                            <span>{t('settings.about')}</span>
                        </button>
                    </div>

                    <div className="settings-content">
                        {isLoading ? (
                            <div className="settings-loading">
                                <Loader2 size={24} className="spin" />
                                <span>{t('settings.loading')}</span>
                            </div>
                        ) : (
                            renderTabContent()
                        )}
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="reset-btn" onClick={() => {
                        setConfirmDialog({
                            isOpen: true,
                            title: t('settings.resetConfirmTitle'),
                            message: t('settings.resetConfirmMessage'),
                            details: [
                                t('settings.resetDetail1'),
                                t('settings.resetDetail2'),
                                t('settings.resetDetail3'),
                                t('settings.resetDetail4')
                            ],
                            onConfirm: async () => {
                                await resetSettings();
                                engineStore.setEngine('webllm');
                                setConfirmDialog(null);
                            }
                        });
                    }}>
                        <RotateCcw size={16} />
                        {t('settings.resetToDefault')}
                    </button>
                </div>
            </div>

            {/* 自定义确认对话框 */}
            {confirmDialog?.isOpen && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    details={confirmDialog.details}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div>
    );
}

export default Settings;
