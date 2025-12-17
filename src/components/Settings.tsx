/**
 * Settings 设置面板组件
 * macOS 风格的全屏设置面板，包含外观、AI 引擎、角色设定三个 Tab
 */

import { useState, useEffect } from 'react';
import {
    X,
    Palette,
    Bot,
    MessageSquare,
    Sun,
    Moon,
    Coffee,
    Check,
    AlertCircle,
    Loader2,
    Plus,
    Trash2,
    RotateCcw
} from 'lucide-react';
import { useSettings, AppSettings } from '../hooks/useSettings';

type TabType = 'appearance' | 'ai' | 'persona';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
    const [activeTab, setActiveTab] = useState<TabType>('appearance');
    const {
        settings,
        isLoading,
        setSetting,
        setTheme,
        setOllamaUrl,
        testOllamaConnection,
        addPromptTemplate,
        removePromptTemplate,
        updatePromptTemplate,
        resetSettings
    } = useSettings();

    // Ollama 连接测试状态
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // 新模板输入状态
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');

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

    if (!isOpen) return null;

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

    // 添加模板
    const handleAddTemplate = async () => {
        if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
        await addPromptTemplate(newTemplateName.trim(), newTemplateContent.trim());
        setNewTemplateName('');
        setNewTemplateContent('');
    };

    // Tab 内容
    const renderTabContent = () => {
        switch (activeTab) {
            case 'appearance':
                return (
                    <div className="settings-tab-content">
                        {/* 主题选择 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">主题</h3>
                            <div className="theme-options">
                                <button
                                    className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun size={24} />
                                    <span>浅色</span>
                                </button>
                                <button
                                    className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon size={24} />
                                    <span>深色</span>
                                </button>
                                <button
                                    className={`theme-option ${settings.theme === 'tea' ? 'active' : ''}`}
                                    onClick={() => setTheme('tea')}
                                >
                                    <Coffee size={24} />
                                    <span>茶色</span>
                                </button>
                            </div>
                        </div>

                        {/* 字体选择 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">字体</h3>
                            <div className="settings-row">
                                <label>字体风格</label>
                                <select
                                    value={settings.fontFamily}
                                    onChange={(e) => setSetting('fontFamily', e.target.value as AppSettings['fontFamily'])}
                                    className="settings-select"
                                >
                                    <option value="system">系统字体 (无衬线)</option>
                                    <option value="serif">宋体 (衬线)</option>
                                </select>
                            </div>
                            <div className="settings-row">
                                <label>字体大小</label>
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
                    </div>
                );

            case 'ai':
                return (
                    <div className="settings-tab-content">
                        {/* Ollama 配置 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">Ollama 配置</h3>
                            <div className="settings-row">
                                <label>API 地址</label>
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
                                            '测试'
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="settings-row">
                                <label>启用 Ollama</label>
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
                            <h3 className="settings-section-title">引擎策略</h3>
                            <div className="settings-row">
                                <label>优先引擎</label>
                                <select
                                    value={settings.preferredEngine}
                                    onChange={(e) => setSetting('preferredEngine', e.target.value as AppSettings['preferredEngine'])}
                                    className="settings-select"
                                >
                                    <option value="ollama">Ollama (外部大模型)</option>
                                    <option value="webllm">WebLLM (内置小模型)</option>
                                </select>
                            </div>
                            <div className="settings-row">
                                <label>自动降级</label>
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
                                启用后，当优先引擎不可用时自动切换到备用引擎
                            </p>
                        </div>
                    </div>
                );

            case 'persona':
                return (
                    <div className="settings-tab-content">
                        {/* 系统提示词 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">自定义系统提示词</h3>
                            <p className="settings-hint">
                                添加自定义前置提示词，AI 会在每次对话中优先遵循
                            </p>
                            <textarea
                                value={settings.customSystemPrompt}
                                onChange={(e) => setSetting('customSystemPrompt', e.target.value)}
                                placeholder="例如：你是一位专业的写作导师，擅长帮助用户提升写作技巧..."
                                className="settings-textarea"
                                rows={4}
                            />
                        </div>

                        {/* 提示词模板 */}
                        <div className="settings-section">
                            <h3 className="settings-section-title">
                                提示词模板
                                <span className="template-count">
                                    {settings.promptTemplates.length}/5
                                </span>
                            </h3>

                            {/* 已有模板列表 */}
                            {settings.promptTemplates.length > 0 && (
                                <div className="template-list">
                                    {settings.promptTemplates.map((template) => (
                                        <div key={template.id} className="template-item">
                                            <div className="template-header">
                                                <input
                                                    type="text"
                                                    value={template.name}
                                                    onChange={(e) => updatePromptTemplate(template.id, { name: e.target.value })}
                                                    className="template-name-input"
                                                />
                                                <button
                                                    className="template-delete-btn"
                                                    onClick={() => removePromptTemplate(template.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <textarea
                                                value={template.content}
                                                onChange={(e) => updatePromptTemplate(template.id, { content: e.target.value })}
                                                className="template-content-input"
                                                rows={2}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 新增模板 */}
                            {settings.promptTemplates.length < 5 && (
                                <div className="add-template">
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="模板名称"
                                        className="settings-input"
                                    />
                                    <textarea
                                        value={newTemplateContent}
                                        onChange={(e) => setNewTemplateContent(e.target.value)}
                                        placeholder="模板内容..."
                                        className="settings-textarea"
                                        rows={2}
                                    />
                                    <button
                                        className="add-template-btn"
                                        onClick={handleAddTemplate}
                                        disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                                    >
                                        <Plus size={16} />
                                        添加模板
                                    </button>
                                </div>
                            )}
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
                    <h2>设置</h2>
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
                            <span>外观</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            <Bot size={18} />
                            <span>AI 引擎</span>
                        </button>
                        <button
                            className={`settings-tab ${activeTab === 'persona' ? 'active' : ''}`}
                            onClick={() => setActiveTab('persona')}
                        >
                            <MessageSquare size={18} />
                            <span>角色设定</span>
                        </button>
                    </div>

                    {/* Tab 内容 */}
                    <div className="settings-content">
                        {isLoading ? (
                            <div className="settings-loading">
                                <Loader2 size={24} className="spin" />
                                <span>加载中...</span>
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
                        重置为默认
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
