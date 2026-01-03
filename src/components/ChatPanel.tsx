import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Send, Square, Sparkles, Check, Bot, Server, Cloud, X, Download, ChevronDown } from 'lucide-react'
import { ChatMessage, RECOMMENDED_MODELS } from '../services/types'
import { ALL_WEBLLM_MODELS_INFO } from '../engines/webllmModels'
import { UseLLMReturn } from '../hooks/useLLM'
import { isWebLLMEnabled, isWindows } from '../utils/platform'
import { UseEngineStoreReturn } from '../store/engineStore'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import DOMPurify from 'dompurify'
import '../styles/chat-markdown.css'
import ConfirmDialog from './ConfirmDialog'

// 配置 marked
marked.setOptions({
    gfm: true,
    breaks: true
})

// 渲染 LaTeX 公式
const renderLatex = (html: string): string => {
    const codeBlocks: string[] = []
    html = html.replace(/(<code[^>]*>[\s\S]*?<\/code>)|(<pre[^>]*>[\s\S]*?<\/pre>)/gi, (match) => {
        codeBlocks.push(match)
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })

    html = html.replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })
        } catch {
            return formula
        }
    })

    html = html.replace(/\$([^$\n]+)\$/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })
        } catch {
            return formula
        }
    })

    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
        return codeBlocks[parseInt(index)]
    })

    return html
}

interface ChatPanelProps {
    llm: UseLLMReturn
    engineStore?: UseEngineStoreReturn
    openSettings?: () => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm, engineStore, openSettings }) => {
    const { t } = useTranslation()

    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const {
        status,
        modelName,
        loadProgress,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel,
        messages,
        isGenerating,
        sendMessage,
        abortGeneration
    } = llm

    const [showModelMenu, setShowModelMenu] = useState(false)
    const [showEngineMenu, setShowEngineMenu] = useState(false)
    const engineWrapperRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null) // Keep for model menu
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null)

    // 点击外部关闭模型菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Close Model Menu
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowModelMenu(false)
            }
            // Close Engine Menu
            if (engineWrapperRef.current && !engineWrapperRef.current.contains(e.target as Node)) {
                setShowEngineMenu(false)
            }
        }
        if (showModelMenu || showEngineMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showModelMenu, showEngineMenu])

    // 滚动到底部
    const streamingContent = messages.find(m => m.isStreaming)?.content || ''
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    }, [messages, streamingContent])

    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating || status !== 'ready') return
        const message = inputValue
        setInputValue('')
        if (inputRef.current) {
            inputRef.current.style.height = '20px'
        }
        await sendMessage(message)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value)
        const textarea = e.target
        textarea.style.height = '20px'
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 20), 100)
        textarea.style.height = `${newHeight}px`
    }

    const formatModelName = (name: string) => {
        const parts = name.split(':')
        const base = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        const size = parts[1] || ''
        return size ? `${base} ${size.toUpperCase()}` : base
    }


    // WebLLM 首次使用提示显示状态
    const showWebLLMSetup = engineStore?.currentEngine === 'webllm' &&
        !engineStore.webllmReady &&
        engineStore.webllmFirstTimeSetup &&
        !engineStore.webllmLoading;

    return (
        <div className="chat-panel-v2">
            {/* 消息区域 - 添加 relative 定位限制覆盖层范围 */}
            <div className="chat-messages" style={{ position: 'relative' }}>
                {/* WebLLM 首次使用 - 简洁引导界面 */}
                {showWebLLMSetup && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'var(--bg-primary)',
                        zIndex: 10,
                        padding: '24px',
                        textAlign: 'center'
                    }}>
                        {/* 图标 */}
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            marginBottom: '16px'
                        }}>
                            <Bot size={32} style={{ color: 'var(--accent-color)' }} />
                        </div>

                        {/* 引导文字 */}
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: '0 0 8px 0'
                        }}>{t('chat.selectModel')}</h3>
                        <p style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            margin: '0 0 24px 0',
                            maxWidth: '280px'
                        }}>{t('chat.chooseModelHint')}</p>

                        {/* 模型选择下拉按钮 */}
                        <div style={{ position: 'relative' }}>
                            <select
                                id="webllm-model-select"
                                style={{
                                    padding: '12px 40px 12px 16px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-card)',
                                    border: '1.5px solid var(--accent-color)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    minWidth: '220px',
                                    textAlign: 'left'
                                }}
                                defaultValue=""
                                onChange={(e) => {
                                    const modelId = e.target.value;
                                    if (modelId) {
                                        engineStore.selectModel(modelId);
                                        engineStore.completeWebLLMSetup();
                                        engineStore.initWebLLM(modelId);
                                    }
                                }}
                            >
                                <option value="" disabled>{t('model.selectModel')}</option>
                                {ALL_WEBLLM_MODELS_INFO.map((model) => (
                                    <option key={model.model_id} value={model.model_id}>
                                        {model.displayName} ({model.size})
                                    </option>
                                ))}
                            </select>
                            {/* 下拉箭头 */}
                            <ChevronDown
                                size={18}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--accent-color)',
                                    pointerEvents: 'none'
                                }}
                            />
                        </div>

                        {/* 推荐提示 */}
                        <p style={{
                            fontSize: '11px',
                            color: 'var(--text-tertiary)',
                            margin: '16px 0 0 0',
                            maxWidth: '280px'
                        }}>
                            💡 {t('chat.firstUseDesc', { size: '290MB - 4.1GB' })}
                        </p>
                    </div>
                )}

                {/* 当显示 WebLLM 首次设置提示时，不渲染消息列表，避免重合 */}
                {!showWebLLMSetup && (
                    messages.length === 0 ? (
                        <div className="chat-empty">
                            <Sparkles size={32} strokeWidth={1.2} />
                            <p>{t('chat.title')}</p>
                            {/* Windows 平台下的 Ollama 提示 */}
                            {isWindows() && engineStore?.currentEngine === 'ollama' && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    maxWidth: '300px',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ margin: '0 0 8px 0' }}>{t('settings.windowsOllamaTip')}</p>
                                    <a
                                        href="https://ollama.com/download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: 'var(--accent-color)',
                                            textDecoration: 'none',
                                            fontWeight: 500
                                        }}
                                    >
                                        {t('settings.downloadOllama')} &rarr;
                                    </a>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
                                        {t('settings.pleaseEnsureOllamaRunning')}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <ChatBubble key={msg.id} message={msg} />
                            ))}
                            {isGenerating && !messages.some(m => m.isStreaming) && (
                                <div className="chat-bubble assistant">
                                    <div className="bubble-content typing-indicator">
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                        <span className="typing-dot"></span>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 底部区域 - 提高层级防止被覆盖 */}
            <div className="chat-footer" style={{ position: 'relative', zIndex: 20 }}>
                {/* 状态栏 */}
                <div className="chat-status-bar">
                    <div className="chat-model-info" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* 引擎按钮和菜单 */}
                        {engineStore && (
                            <div style={{ position: 'relative' }} ref={engineWrapperRef}>
                                <button
                                    className="engine-type-btn"
                                    onClick={() => setShowEngineMenu(!showEngineMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 10px',
                                        background: 'var(--bg-hover)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-card)'
                                        e.currentTarget.style.borderColor = 'var(--accent-color)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-hover)'
                                        e.currentTarget.style.borderColor = 'var(--border-color)'
                                    }}
                                >
                                    {engineStore.currentEngine === 'webllm' && (
                                        <>
                                            <Bot size={14} />
                                            <span>{t('chat.engineWebLLMShort')}</span>
                                        </>
                                    )}
                                    {engineStore.currentEngine === 'ollama' && (
                                        <>
                                            <Server size={14} />
                                            <span>{t('chat.engineOllamaShort')}</span>
                                        </>
                                    )}
                                    {engineStore.currentEngine === 'openai' && (
                                        <>
                                            <Cloud size={14} />
                                            <span>{t('chat.engineCloudShort')}</span>
                                        </>
                                    )}
                                </button>

                                {/* 引擎切换下拉菜单 */}
                                {showEngineMenu && (
                                    <div
                                        className="model-dropdown"
                                        style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '0',
                                            right: 'auto',
                                            transform: 'none',
                                            marginBottom: '8px',
                                            minWidth: '160px',
                                            width: 'max-content'
                                        }}
                                    >
                                        <div className="model-section-title">{t('chat.aiEngine')}</div>
                                        {[
                                            ...(isWebLLMEnabled() ? [{ type: 'webllm' as const, icon: <Bot size={14} />, label: t('chat.engineWebLLM'), bgColor: 'rgba(16, 185, 129, 0.08)' }] : []),
                                            { type: 'ollama' as const, icon: <Server size={14} />, label: t('chat.engineOllama'), bgColor: 'rgba(245, 158, 11, 0.08)' },
                                            { type: 'openai' as const, icon: <Cloud size={14} />, label: t('chat.engineCloud'), bgColor: 'rgba(59, 130, 246, 0.08)' }
                                        ].map((engine) => (
                                            <button
                                                key={engine.type}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    engineStore.setEngine(engine.type)


                                                    // WebLLM 自动初始化逻辑
                                                    // 只有在非首次使用时才自动加载
                                                    if (engine.type === 'webllm') {
                                                        const savedModel = localStorage.getItem('zen-selected-webllm-model')
                                                        const targetModel = savedModel || ALL_WEBLLM_MODELS_INFO[0]?.model_id

                                                        if (!engineStore.webllmReady && !engineStore.webllmLoading && !engineStore.webllmFirstTimeSetup && targetModel) {
                                                            engineStore.initWebLLM(targetModel)
                                                        }
                                                    }


                                                    setShowEngineMenu(false)
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: engineStore.currentEngine === engine.type ? engine.bgColor : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    marginBottom: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (engineStore.currentEngine !== engine.type) {
                                                        e.currentTarget.style.background = 'var(--bg-hover)'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (engineStore.currentEngine !== engine.type) {
                                                        e.currentTarget.style.background = 'transparent'
                                                    }
                                                }}
                                            >
                                                {engine.icon}
                                                <span>{engine.label}</span>
                                                {engineStore.currentEngine === engine.type && <Check size={12} style={{ marginLeft: 'auto' }} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}



                        {/* 模型按钮 / 状态显示 */}
                        {/* 优先检查连接错误状态 */}
                        {(engineStore?.currentEngine === 'ollama' && !engineStore.ollamaAvailable) ||
                            (engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus !== 'success') ? (
                            <div
                                className={`status-btn ${(engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus === 'error') ||
                                    (engineStore?.currentEngine === 'ollama' && !engineStore.ollamaAvailable)
                                    ? 'error'
                                    : engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus === 'untested'
                                        ? 'untested'
                                        : 'disconnected'
                                    }`}
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                title={t('chat.clickToSetup')}
                                onClick={() => {
                                    if (openSettings) {
                                        openSettings()
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '0.8'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '1'
                                }}
                            >
                                <span className="status-indicator" />
                                <span className="status-text">
                                    {engineStore?.currentEngine === 'openai'
                                        ? (engineStore.cloudApiStatus === 'error' ? t('chat.connectionFailed') : t('chat.notTested'))
                                        : t('chat.connectionFailed')}
                                </span>
                                <span className="status-action">{t('chat.clickToSetup')}</span>
                            </div>
                        ) : (engineStore?.currentEngine === 'ollama' && engineStore.ollamaAvailable && ollamaModels.length === 0) ? (
                            /* Ollama 已连接但没有模型 */
                            <div
                                className="status-btn untested"
                                style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                title={t('chat.clickToSetup')}
                                onClick={() => {
                                    if (openSettings) {
                                        openSettings()
                                    }
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '0.8'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '1'
                                }}
                            >
                                <span className="status-indicator" />
                                <span className="status-text">{t('chat.noModelsAvailable')}</span>
                                <span className="status-action">{t('chat.clickToSetup')}</span>
                            </div>
                        ) : status === 'ready' ? (
                            isGenerating ? (
                                <div className="model-status-btn" style={{
                                    padding: '6px 10px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'var(--text-secondary)'
                                }}>
                                    {t('chat.thinking')}
                                </div>
                            ) : ollamaModels.length >= 1 && engineStore?.currentEngine === 'ollama' ? (
                                <div className="webllm-model-selector" ref={menuRef}>
                                    <button
                                        className="model-name-btn"
                                        onClick={() => setShowModelMenu(!showModelMenu)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '6px 10px',
                                            background: 'var(--bg-hover)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'var(--text-primary)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-card)'
                                            e.currentTarget.style.borderColor = 'var(--accent-color)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-hover)'
                                            e.currentTarget.style.borderColor = 'var(--border-color)'
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)'
                                        }}>
                                            {formatModelName(selectedOllamaModel || modelName)}
                                        </span>

                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            color: '#f59e0b',
                                            padding: '2px 6px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            borderRadius: '4px'
                                        }}>
                                            {t('chat.engineOllamaShort')}
                                        </span>
                                    </button>
                                    {showModelMenu && createPortal(
                                        <div className="model-dropdown" ref={menuRef}>
                                            {/* 已安装模型 */}
                                            <div className="model-section">
                                                <div className="model-section-title">{t('settings.installedModels')}</div>
                                                {[...ollamaModels].sort((a, b) => {
                                                    const aBuiltIn = RECOMMENDED_MODELS.find(m => m.name === a.name)?.builtIn ? 1 : 0
                                                    const bBuiltIn = RECOMMENDED_MODELS.find(m => m.name === b.name)?.builtIn ? 1 : 0
                                                    return bBuiltIn - aBuiltIn
                                                }).map((model) => {
                                                    const isCurrentModel = model.name === selectedOllamaModel
                                                    return (
                                                        <div
                                                            key={model.name}
                                                            className={`model-item ${isCurrentModel ? 'active' : ''}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '10px 12px',
                                                                background: isCurrentModel ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                                                                borderRadius: '6px',
                                                                marginBottom: '4px',
                                                                cursor: isCurrentModel ? 'default' : 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onClick={() => {
                                                                if (!isCurrentModel) {
                                                                    setSelectedOllamaModel(model.name)
                                                                    setShowModelMenu(false)
                                                                }
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!isCurrentModel) {
                                                                    e.currentTarget.style.background = 'var(--bg-hover)'
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!isCurrentModel) {
                                                                    e.currentTarget.style.background = 'transparent'
                                                                }
                                                            }}
                                                        >
                                                            <span style={{
                                                                fontSize: '13px',
                                                                fontWeight: 600,
                                                                color: 'var(--text-primary)',
                                                                flex: '0 0 auto'
                                                            }}>
                                                                {formatModelName(model.name)}
                                                            </span>
                                                            {model.formattedSize && (
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 500,
                                                                    color: 'var(--text-tertiary)',
                                                                    flex: '0 0 auto'
                                                                }}>
                                                                    {model.formattedSize}
                                                                </span>
                                                            )}
                                                            {isCurrentModel && (
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 500,
                                                                    color: '#10b981',
                                                                    padding: '2px 8px',
                                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                                    borderRadius: '4px',
                                                                    marginLeft: 'auto',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <Check size={10} /> {t('chat.inUse')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>




                                        </div>,
                                        document.body
                                    )}
                                </div>
                            ) : engineStore?.currentEngine === 'webllm' ? (
                                (() => {
                                    const modelInfo = ALL_WEBLLM_MODELS_INFO.find(
                                        m => m.model_id === engineStore.selectedModel
                                    ) || ALL_WEBLLM_MODELS_INFO[0];

                                    return (
                                        <div className="webllm-model-selector" ref={menuRef}>
                                            <button
                                                className="model-name-btn"
                                                onClick={() => setShowModelMenu(!showModelMenu)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '6px 10px',
                                                    background: 'var(--bg-hover)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    color: 'var(--text-primary)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--bg-card)'
                                                    e.currentTarget.style.borderColor = 'var(--accent-color)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'var(--bg-hover)'
                                                    e.currentTarget.style.borderColor = 'var(--border-color)'
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {modelInfo.displayName}
                                                </span>

                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 500,
                                                    color: '#10b981',
                                                    padding: '2px 6px',
                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                    borderRadius: '4px'
                                                }}>
                                                    {t('model.builtIn')}
                                                </span>
                                            </button>

                                            {showModelMenu && createPortal(
                                                <div className="model-dropdown" ref={menuRef}>
                                                    <div className="model-section">
                                                        <div className="model-section-title">{t('model.selectModel')}</div>
                                                        {ALL_WEBLLM_MODELS_INFO.map((model) => {
                                                            const isCurrentModel = model.model_id === engineStore.selectedModel
                                                            const isDownloaded = engineStore.webllmCachedModels.includes(model.model_id)

                                                            return (
                                                                <div
                                                                    key={model.model_id}
                                                                    className={`model-item ${isCurrentModel ? 'active' : ''}`}
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '4px',
                                                                        padding: '10px 12px',
                                                                        background: isCurrentModel ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                                                                        borderRadius: '6px',
                                                                        marginBottom: '4px',
                                                                        cursor: isCurrentModel ? 'default' : 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onClick={() => {
                                                                        if (!isCurrentModel) {
                                                                            // 切换模型并开始加载
                                                                            engineStore.selectModel(model.model_id)
                                                                            engineStore.initWebLLM(model.model_id)
                                                                            setShowModelMenu(false)
                                                                        }
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isCurrentModel) {
                                                                            e.currentTarget.style.background = 'var(--bg-hover)'
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isCurrentModel) {
                                                                            e.currentTarget.style.background = 'transparent'
                                                                        }
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            color: 'var(--text-primary)'
                                                                        }}>
                                                                            {model.displayName}
                                                                        </span>
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            color: 'var(--text-tertiary)'
                                                                        }}>
                                                                            {model.size}
                                                                        </span>
                                                                        {isCurrentModel ? (
                                                                            <span style={{
                                                                                fontSize: '11px',
                                                                                fontWeight: 500,
                                                                                color: '#10b981',
                                                                                padding: '2px 8px',
                                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                                borderRadius: '4px',
                                                                                marginLeft: 'auto',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}>
                                                                                <Check size={10} /> {t('model.inUse')}
                                                                            </span>
                                                                        ) : isDownloaded ? (
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                color: '#10b981',
                                                                                marginLeft: 'auto'
                                                                            }}>✓ {t('model.downloaded')}</span>
                                                                        ) : (
                                                                            <span style={{
                                                                                fontSize: '10px',
                                                                                color: 'var(--text-secondary)',
                                                                                marginLeft: 'auto',
                                                                                padding: '2px 6px',
                                                                                background: 'var(--bg-secondary)',
                                                                                border: '1px solid var(--border-color)',
                                                                                borderRadius: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px'
                                                                            }}>
                                                                                <Download size={10} /> {t('model.download')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: '11px',
                                                                        color: 'var(--text-secondary)'
                                                                    }}>
                                                                        {t(model.descriptionKey || model.description)}
                                                                    </div>

                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>,
                                                document.body
                                            )}
                                        </div>
                                    );
                                })()
                            ) : engineStore?.currentEngine === 'openai' ? (
                                <div className="model-display-card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 10px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px'
                                }}>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)'
                                    }}>
                                        {engineStore.cloudConfig?.modelName || 'Cloud API'}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        color: '#3b82f6',
                                        padding: '2px 6px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '4px'
                                    }}>
                                        {t('chat.engineCloudShort')}
                                    </span>
                                </div>
                            ) : (
                                <span className="model-label">{formatModelName(modelName)}</span>
                            )
                        ) : status === 'loading' ? (() => {
                            // 判断当前模型是否已缓存
                            const isCached = engineStore?.currentEngine === 'webllm' &&
                                engineStore.webllmCachedModels.includes(engineStore.selectedModel);
                            const loadingText = isCached ? t('chat.localLoading') : t('chat.downloading');
                            return (
                                <div className="model-loading-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <span className="loading-text">
                                            {loadProgress ? `${loadingText} ${Math.round(loadProgress.progress * 100)}%` : loadingText}
                                        </span>
                                        {loadProgress && (
                                            <div className="loading-progress-bar">
                                                <div
                                                    className="loading-progress-fill"
                                                    style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {/* 取消按钮 - 仅在 WebLLM 下载时显示 */}
                                    {engineStore?.currentEngine === 'webllm' && (
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
                                            title={t('models.cancelDownload')}
                                            style={{
                                                padding: '4px',
                                                borderRadius: '50%',
                                                border: 'none',
                                                background: 'var(--bg-hover)',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })() : null}
                    </div>
                </div>

                {/* 输入框 */}
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={status === 'ready' ? t('chat.placeholder') : t('chat.waitingReady')}
                        disabled={status !== 'ready'}
                        rows={1}
                    />

                    {isGenerating ? (
                        <button className="send-btn stop" onClick={abortGeneration}>
                            <Square size={14} fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            className="send-btn"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || status !== 'ready'}
                        >
                            <Send size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ConfirmDialog */}
            {confirmDialog && createPortal(
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />,
                document.body
            )}
        </div>
    )
}


const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const rawHtml = message.role === 'user'
        ? message.content.replace(/\n/g, '<br/>')
        : renderLatex(marked(message.content) as string)

    const sanitizedHtml = DOMPurify.sanitize(rawHtml)

    return (
        <div className={`chat-bubble ${message.role}`}>
            <div
                className={`bubble-content markdown-body ${message.isStreaming ? 'streaming' : ''}`}
            >
                <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                {message.isStreaming && <span className="typing-cursor" />}
            </div>
        </div>
    )
}

export default ChatPanel
