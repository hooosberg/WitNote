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
    Sun,
    Moon,
    Coffee,
    Loader2,
    RotateCcw,
    Trash2,
    Check
} from 'lucide-react';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { changeLanguage, getCurrentLanguage, LanguageCode } from '../i18n';
import { UseLLMReturn } from '../hooks/useLLM';
import { getDefaultSystemPrompt } from '../services/types';
import { UseEngineStoreReturn } from '../store/engineStore';
import { ALL_WEBLLM_MODELS_INFO } from '../engines/webllmModels';

type TabType = 'appearance' | 'ai' | 'persona' | 'guide';

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

export function Settings({ isOpen, onClose, llm, defaultTab, engineStore }: SettingsProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'appearance');

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
        resetSettings
    } = useSettings();

    const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
    const [appVersion, setAppVersion] = useState('1.2.1'); // 默认版本号

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
                            <h3 className="settings-section-title" style={{ textAlign: 'center', marginBottom: 0 }}>选择 AI 引擎</h3>
                            <div className="engine-selector-container">
                                <div className="engine-selector-line" />

                                {/* WebLLM - 本地内置 */}
                                <button
                                    className={`engine-selector-item ${engineStore.currentEngine === 'webllm' ? 'active' : ''}`}
                                    onClick={() => engineStore.setEngine('webllm')}
                                    title="本地内置模型"
                                >
                                    <div className="engine-circle"><Bot size={24} /></div>
                                    <span className="engine-label">WebLLM</span>
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
                                    <span className="engine-label">Ollama (外部)</span>
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
                                    <span className="engine-label">Cloud API</span>
                                </button>
                            </div>
                        </div>

                        {/* WebLLM 内容 */}
                        {engineStore.currentEngine === 'webllm' && (
                            <div className="settings-section fade-in">
                                <div className="settings-section-header">
                                    <h3 className="settings-section-title">内置 WebLLM 模型</h3>
                                    <button
                                        className={`status-btn ${engineStore.webllmReady ? 'connected' : 'disconnected'}`}
                                        onClick={() => engineStore.webllmReady ? null : engineStore.initWebLLM(engineStore.selectedModel)}
                                        title={engineStore.webllmReady ? '已就绪' : '点击加载'}
                                    >
                                        <span className="status-indicator" />
                                        <span className="status-text">{engineStore.webllmReady ? '已就绪' : '未加载'}</span>
                                        <span className="status-action">{engineStore.webllmReady ? '已就绪' : '加载模型'}</span>
                                    </button>
                                </div>
                                <div className="recommended-models" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {ALL_WEBLLM_MODELS_INFO.map(modelInfo => {
                                        const isSelected = engineStore.selectedModel === modelInfo.model_id;
                                        const isLoading = isSelected && engineStore.webllmLoading;
                                        const isReady = isSelected && engineStore.webllmReady;
                                        const isCached = engineStore.webllmCachedModels.includes(modelInfo.model_id) || modelInfo.isBuiltIn;
                                        const progressVal = engineStore.webllmProgress ? Math.round(engineStore.webllmProgress.progress * 100) : 0;

                                        return (
                                            <div key={modelInfo.model_id} className="model-card" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '10px',
                                                border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border-color)'
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
                                                        <Loader2 size={18} className="spin" style={{ color: 'var(--accent)' }} />
                                                    ) : isReady && isSelected ? (
                                                        <span style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            color: '#1e8e3e',
                                                            fontSize: '13px'
                                                        }}>
                                                            <Check size={16} /> 使用中
                                                        </span>
                                                    ) : (
                                                        <button
                                                            className="download-btn"
                                                            onClick={() => engineStore.initWebLLM(modelInfo.model_id)}
                                                            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                                                        >
                                                            {isCached ? '使用' : '下载'}
                                                        </button>
                                                    )}

                                                    {/* 删除按钮 */}
                                                    {isCached && !modelInfo.isBuiltIn && !isLoading && (
                                                        <button
                                                            className="icon-btn"
                                                            title="删除缓存"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`删除 ${modelInfo.displayName} 的缓存？`)) {
                                                                    engineStore.deleteWebLLMModel(modelInfo.model_id);
                                                                }
                                                            }}
                                                            style={{ padding: '6px', color: 'var(--text-secondary)' }}
                                                        >
                                                            <Trash2 size={16} />
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
                                    <h3 className="settings-section-title">External Ollama</h3>
                                    <button
                                        className={`status-btn ${engineStore.ollamaAvailable ? 'connected' : 'disconnected'}`}
                                        onClick={() => engineStore.refreshOllamaStatus()}
                                        title="点击测试连接"
                                    >
                                        <span className="status-indicator" />
                                        <span className="status-text">{engineStore.ollamaAvailable ? '已连接' : '未连接'}</span>
                                        <span className="status-action">测试连接</span>
                                    </button>
                                </div>
                                <p className="settings-hint">
                                    请确保 <a href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a> 已在后台运行。
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
                                            <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>服务器地址</label>
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
                                            <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>端口</label>
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
                                        <div style={{ marginTop: 24, marginBottom: 12 }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>已安装模型</h4>
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
                                                        padding: '10px 14px',
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: '8px',
                                                        border: model.name === engineStore.selectedModel ? '2px solid var(--accent)' : '1px solid var(--border-color)'
                                                    }}>
                                                        <div>
                                                            <span style={{ fontWeight: 500 }}>{model.name}</span>
                                                            {model.name === engineStore.selectedModel && (
                                                                <span style={{
                                                                    marginLeft: '8px',
                                                                    fontSize: '11px',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '10px',
                                                                    background: 'var(--accent)',
                                                                    color: 'white'
                                                                }}>
                                                                    使用中
                                                                </span>
                                                            )}
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                {model.formattedSize}
                                                            </div>
                                                        </div>
                                                        {model.name !== engineStore.selectedModel && (
                                                            <button
                                                                className="download-btn"
                                                                onClick={() => engineStore.selectModel(model.name)}
                                                                style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
                                                            >
                                                                使用
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Cloud 内容 */}
                        {engineStore.currentEngine === 'openai' && (
                            <div className="settings-section fade-in">
                                <div className="settings-section-header">
                                    <h3 className="settings-section-title">Cloud API 配置</h3>
                                    <button
                                        className={`status-btn ${engineStore.cloudApiStatus === 'success' ? 'connected' : engineStore.cloudApiStatus === 'error' ? 'error' : 'untested'}`}
                                        onClick={() => engineStore.testCloudApi()}
                                        title="点击测试连接"
                                    >
                                        <span className="status-indicator" />
                                        <span className="status-text">
                                            {engineStore.cloudApiStatus === 'success' ? '已连接' :
                                                engineStore.cloudApiStatus === 'error' ? '连接失败' : '未测试'}
                                        </span>
                                        <span className="status-action">测试连接</span>
                                    </button>
                                </div>

                                {/* 支持平台列表 */}
                                <p className="settings-hint" style={{ marginBottom: '12px' }}>
                                    支持平台：OpenAI, Google Gemini, DeepSeek, Claude, Groq, Mistral, 零一万物, 通义千问 等 OpenAI 兼容接口。
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
                                            <label style={{ fontSize: '12px', marginBottom: '6px', display: 'block', color: 'var(--text-secondary)' }}>模型名称</label>
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
                                    <strong>📖 配置指南</strong>
                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', lineHeight: '1.8' }}>
                                        <li><a href="https://platform.openai.com/docs" target="_blank" rel="noreferrer">OpenAI 文档</a></li>
                                        <li><a href="https://ai.google.dev/docs" target="_blank" rel="noreferrer">Google Gemini 文档</a> (Base URL: generativelanguage.googleapis.com/v1beta/openai/)</li>
                                        <li><a href="https://api-docs.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek 文档</a></li>
                                    </ul>
                                </div>

                                <p className="settings-hint" style={{ fontSize: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <HelpCircle size={12} /> API Key 仅保存在本地，不会上传。
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 'persona':
                // 根据当前语言获取默认提示词
                const defaultPromptForLang = getDefaultSystemPrompt(currentLang);
                // 获取当前显示的提示词：如果用户设置了则显示用户的，否则显示内置默认
                const displayPrompt = settings.systemPrompt || defaultPromptForLang;
                const isCustomized = settings.systemPrompt && settings.systemPrompt.trim() !== '';

                return (
                    <div className="settings-tab-content">
                        <div className="settings-section">
                            <div className="settings-section-header">
                                <h3 className="settings-section-title">{t('settings.defaultPrompt')}</h3>
                                {isCustomized && (
                                    <button
                                        className="restore-default-btn"
                                        onClick={() => setSetting('systemPrompt', '')}
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
                                rows={10}
                            />
                            {!isCustomized && (
                                <p className="settings-hint" style={{ marginTop: '8px' }}>
                                    {t('settings.customPromptEmpty')}
                                </p>
                            )}
                        </div>
                    </div>
                );

            case 'guide':
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
                            <p className="guide-version">版本 {appVersion} · 2025</p>
                            <p className="guide-license">
                                {t('guide.license')} <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>
                            </p>
                        </div>

                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.credits.title')}</h3>
                            <div className="guide-credits">
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
                            className={`settings-tab ${activeTab === 'guide' ? 'active' : ''}`}
                            onClick={() => setActiveTab('guide')}
                        >
                            <HelpCircle size={18} />
                            <span>{t('settings.guide')}</span>
                        </button>
                    </div>

                    <div className="settings-content">
                        {isLoading ? (
                            <div className="settings-loading">
                                <Loader2 size={24} className="spin" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            renderTabContent()
                        )}
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="reset-btn" onClick={resetSettings}>
                        <RotateCcw size={16} />
                        {t('settings.resetToDefault')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
