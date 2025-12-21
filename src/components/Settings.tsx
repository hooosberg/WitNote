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
    Check,
    Download,
    FolderOpen
} from 'lucide-react';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { changeLanguage, getCurrentLanguage, LanguageCode } from '../i18n';
import { UseLLMReturn } from '../hooks/useLLM';
import { ALL_MODELS, getDefaultSystemPrompt } from '../services/types';

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
}

export function Settings({ isOpen, onClose, llm, defaultTab }: SettingsProps) {
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
                        <h3 className="settings-section-title">{t('settings.aiModelManagement')}</h3>
                        <p className="settings-hint ollama-download-hint">
                            {t('settings.builtInModelHint')}
                        </p>

                        {/* 本地模型列表 */}
                        {llm && (
                            <>
                                {/* 模型存储路径 */}
                                <div className="model-storage-path">
                                    <span className="path-label">{t('settings.modelStoragePath')}:</span>
                                    <button
                                        className="path-btn"
                                        onClick={() => window.ollama?.openModelsFolder()}
                                        title={t('settings.openFolder')}
                                    >
                                        <FolderOpen size={14} />
                                        <span>{t('settings.openFolder')}</span>
                                    </button>
                                </div>

                                <div className="settings-section-subtitle" style={{ marginTop: 16 }}>
                                    <h4>{t('settings.installedModels')}</h4>
                                </div>
                                <div className="models-list">
                                    {llm.ollamaModels.length === 0 ? (
                                        <div className="empty-state">{t('settings.noModelsInstalled')}</div>
                                    ) : (
                                        llm.ollamaModels.map(model => {
                                            const isBuiltIn = ALL_MODELS.find(m => m.name === model.name)?.builtIn;
                                            return (
                                                <div key={model.name} className="model-item">
                                                    <div className="model-info">
                                                        <div className="model-name">
                                                            {model.name}
                                                            {isBuiltIn && <span className="builtin-tag">{t('chat.builtIn')}</span>}
                                                            {model.name === llm.selectedOllamaModel && (
                                                                <span className="current-badge">{t('settings.currentUsing')}</span>
                                                            )}
                                                        </div>
                                                        <div className="model-meta">
                                                            {model.formattedSize || ''} • {model.modified_at?.split('T')[0]}
                                                        </div>
                                                    </div>
                                                    <div className="model-actions">
                                                        {model.name !== llm.selectedOllamaModel && (
                                                            <button
                                                                className="text-btn"
                                                                onClick={() => llm.setSelectedOllamaModel(model.name)}
                                                            >
                                                                {t('settings.useThis')}
                                                            </button>
                                                        )}
                                                        {!isBuiltIn && model.name !== llm.selectedOllamaModel && (
                                                            <button
                                                                className="icon-btn danger"
                                                                onClick={() => llm.deleteModel(model.name)}
                                                                title={t('settings.deleteModel')}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* 可下载模型列表 */}
                                <h4 className="settings-section-subtitle" style={{ marginTop: 20 }}>
                                    {t('settings.availableModels') || '可下载模型'}
                                </h4>
                                <div className="recommended-models">
                                    {ALL_MODELS.map(rec => {
                                        // 精确匹配模型名称
                                        const isInstalled = llm.ollamaModels.some(m => m.name === rec.name);
                                        const isDownloading = llm.downloadProgressMap.has(rec.name);
                                        const progress = llm.downloadProgressMap.get(rec.name);

                                        return (
                                            <div key={rec.name} className="model-card">
                                                <div className="model-header">
                                                    <div className="model-title">
                                                        {rec.name}
                                                        {rec.builtIn && <span className="builtin-tag">{t('chat.builtIn')}</span>}
                                                    </div>
                                                    <div className="model-size">{rec.size}</div>
                                                </div>

                                                <div className="model-tagline-text">{t(rec.taglineKey)}</div>
                                                <div className="model-footer">
                                                    {isInstalled ? (
                                                        <div className="status-installed">
                                                            <Check size={14} />
                                                            <span>{t('settings.installed')}</span>
                                                        </div>
                                                    ) : isDownloading ? (
                                                        <div className="download-progress">
                                                            <Loader2 size={14} className="spin" />
                                                            <span className="progress-text">
                                                                {progress?.progress || 0}%
                                                            </span>
                                                            <button
                                                                className="cancel-btn"
                                                                onClick={() => llm.cancelPull(rec.name)}
                                                                title={t('models.cancelDownload')}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className="download-btn"
                                                            onClick={() => llm.pullModel(rec.name)}
                                                        >
                                                            <Download size={14} />
                                                            {t('settings.download')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 下载进度条 - 显示所有正在下载的模型 */}
                                {llm.downloadProgressMap.size > 0 && (
                                    <div className="global-download-status">
                                        {Array.from(llm.downloadProgressMap.entries()).map(([modelName, progressInfo]) => (
                                            <div key={modelName} className="download-item">
                                                <div className="status-header">
                                                    <Loader2 size={14} className="spin" />
                                                    <span>{t('settings.downloading') || '正在下载'} {modelName}...</span>
                                                    <button
                                                        className="cancel-btn"
                                                        onClick={() => llm.cancelPull(modelName)}
                                                        title={t('models.cancelDownload')}
                                                    >
                                                        {t('models.cancelDownload') || '取消'}
                                                    </button>
                                                </div>
                                                <div className="download-progress-bar">
                                                    <div
                                                        className="download-progress-fill"
                                                        style={{ width: `${progressInfo.progress}%` }}
                                                    />
                                                </div>
                                                <div className="status-output">
                                                    {progressInfo.progress}% - {progressInfo.output}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
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
