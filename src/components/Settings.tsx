/**
 * Settings 设置面板组件
 * macOS 风格的全屏设置面板，包含外观、AI 引擎、角色设定、使用说明四个 Tab
 * 支持国际化 (i18n)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Palette,
    Bot,
    MessageSquare,
    HelpCircle,
    ExternalLink,
    Sun,
    Moon,
    Coffee,
    Check,
    AlertCircle,
    Loader2,
    RotateCcw,
    Globe
} from 'lucide-react';
import { useSettings, AppSettings } from '../hooks/useSettings';
import { changeLanguage, getCurrentLanguage } from '../i18n';

type TabType = 'appearance' | 'ai' | 'persona' | 'guide';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('appearance');
    const {
        settings,
        isLoading,
        setSetting,
        setTheme,
        setOllamaUrl,
        testOllamaConnection,
        resetSettings
    } = useSettings();

    // 当前语言状态
    const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

    // Ollama 连接测试状态
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // 临时 URL 输入状态
    const [tempOllamaUrl, setTempOllamaUrl] = useState(settings.ollamaBaseUrl);

    // 同步 URL
    useEffect(() => {
        setTempOllamaUrl(settings.ollamaBaseUrl);
    }, [settings.ollamaBaseUrl]);

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

    // 切换语言
    const handleLanguageChange = (lang: 'en' | 'zh') => {
        changeLanguage(lang);
        setCurrentLang(lang);
    };

    // 测试 Ollama 连接
    const handleTestConnection = async () => {
        setIsTestingConnection(true);
        setConnectionStatus('idle');

        // 先保存 URL
        await setOllamaUrl(tempOllamaUrl);

        const success = await testOllamaConnection();
        setConnectionStatus(success ? 'success' : 'error');
        setIsTestingConnection(false);

        // 3 秒后重置状态
        setTimeout(() => setConnectionStatus('idle'), 3000);
    };

    // Tab 内容
    const renderTabContent = () => {
        switch (activeTab) {
            case 'appearance':
                return (
                    <div className="settings-tab-content">
                        {/* 语言选择 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.language')}</h3>
                            <div className="language-options">
                                <button
                                    className={`language-option ${currentLang === 'en' ? 'active' : ''}`}
                                    onClick={() => handleLanguageChange('en')}
                                >
                                    <Globe size={18} />
                                    <span>English</span>
                                </button>
                                <button
                                    className={`language-option ${currentLang === 'zh' ? 'active' : ''}`}
                                    onClick={() => handleLanguageChange('zh')}
                                >
                                    <Globe size={18} />
                                    <span>中文</span>
                                </button>
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
                        {/* Ollama 配置 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.ollamaConfig')}</h3>
                            <p className="settings-hint ollama-download-hint">
                                {t('settings.ollamaHint')}{' '}
                                <a
                                    href="https://ollama.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="external-link"
                                >
                                    Ollama <ExternalLink size={12} />
                                </a>
                                {' '}{t('settings.ollamaHint2')}
                            </p>
                            <div className="settings-row">
                                <label>{t('settings.apiUrl')}</label>
                                <div className="ollama-url-input">
                                    <input
                                        type="text"
                                        value={tempOllamaUrl}
                                        onChange={(e) => setTempOllamaUrl(e.target.value)}
                                        onBlur={() => setOllamaUrl(tempOllamaUrl)}
                                        placeholder="http://localhost:11434"
                                        className="settings-input"
                                    />
                                    <button
                                        className={`test-connection-btn ${connectionStatus}`}
                                        onClick={handleTestConnection}
                                        disabled={isTestingConnection}
                                    >
                                        {isTestingConnection ? (
                                            <Loader2 size={16} className="spin" />
                                        ) : connectionStatus === 'success' ? (
                                            <Check size={16} />
                                        ) : connectionStatus === 'error' ? (
                                            <AlertCircle size={16} />
                                        ) : (
                                            t('settings.testConnection')
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="settings-row">
                                <label>{t('settings.enableOllama')}</label>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.ollamaEnabled}
                                        onChange={(e) => setSetting('ollamaEnabled', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* 引擎策略 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.engineStrategy')}</h3>
                            <div className="settings-row">
                                <label>{t('settings.autoFallback')}</label>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoFallback}
                                        onChange={(e) => setSetting('autoFallback', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                            <p className="settings-hint">
                                {t('settings.autoFallbackHint')}
                            </p>
                        </div>
                    </div>
                );

            case 'persona':
                return (
                    <div className="settings-tab-content">
                        {/* 系统提示词 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('settings.customPrompt')}</h3>
                            <p className="settings-hint">
                                {t('settings.customPromptHint')}
                            </p>
                            <textarea
                                value={settings.customSystemPrompt}
                                onChange={(e) => setSetting('customSystemPrompt', e.target.value)}
                                placeholder={t('settings.customPromptPlaceholder')}
                                className="settings-textarea"
                                rows={6}
                            />
                            <p className="settings-hint" style={{ marginTop: '8px' }}>
                                {t('settings.customPromptEmpty')}
                            </p>
                        </div>
                    </div>
                );

            case 'guide':
                return (
                    <div className="settings-tab-content guide-content">
                        {/* 软件介绍 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.aboutTitle')}</h3>
                            <div className="guide-intro">
                                <p className="guide-tagline">{t('guide.tagline')}</p>
                                <p className="guide-description">
                                    {t('guide.description')}
                                </p>
                                <p className="guide-platform">
                                    {t('guide.platform')}
                                </p>
                            </div>
                        </div>

                        {/* 设计理念 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.philosophy')}</h3>
                            <ul className="guide-list">
                                <li><strong>{t('guide.philosophySmart')}</strong> {t('guide.philosophySmartDesc')}</li>
                                <li><strong>{t('guide.philosophySimple')}</strong> {t('guide.philosophySimpleDesc')}</li>
                                <li><strong>{t('guide.philosophySecure')}</strong> {t('guide.philosophySecureDesc')}</li>
                            </ul>
                        </div>

                        {/* 快速上手 */}
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

                        {/* AI 引擎说明 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">{t('guide.aiEngines')}</h3>
                            <div className="guide-engines">
                                <div className="engine-card">
                                    <div className="engine-header">
                                        <span className="engine-badge builtin">{t('guide.builtIn')}</span>
                                        <strong>WebLLM</strong>
                                    </div>
                                    <p>{t('guide.webllmDesc')}</p>
                                </div>
                                <div className="engine-card">
                                    <div className="engine-header">
                                        <span className="engine-badge external">{t('guide.external')}</span>
                                        <strong>Ollama</strong>
                                    </div>
                                    <p>
                                        {t('guide.ollamaDesc')}
                                        <a href="https://ollama.com" target="_blank" rel="noopener noreferrer"> {t('guide.ollamaDownload')} </a>
                                        {t('guide.ollamaModels')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 开发者信息 */}
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
                            <p className="guide-version">
                                {t('guide.version')}
                            </p>
                            <p className="guide-license">
                                {t('guide.license')} <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">MIT License</a>
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                {/* 头部 */}
                <div className="settings-header">
                    <h2>{t('settings.title')}</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* 主体 */}
                <div className="settings-body">
                    {/* 侧边 Tab */}
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

                    {/* Tab 内容 */}
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

                {/* 底部 */}
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
