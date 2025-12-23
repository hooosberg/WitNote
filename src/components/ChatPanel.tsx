import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Send, Square, Sparkles, Check, Bot, Server, Cloud } from 'lucide-react'
import { ChatMessage, RECOMMENDED_MODELS } from '../services/types'
import { ALL_WEBLLM_MODELS_INFO } from '../engines/webllmModels'
import { UseLLMReturn } from '../hooks/useLLM'
import { UseEngineStoreReturn } from '../store/engineStore'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import DOMPurify from 'dompurify'
import '../styles/chat-markdown.css'

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

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm, engineStore }) => {
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
    const [expandedModel, setExpandedModel] = useState<string | null>(null)
    const [showEngineMenu, setShowEngineMenu] = useState(false)
    const [engineMenuPosition, setEngineMenuPosition] = useState<{ left: number; bottom: number } | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const engineMenuRef = useRef<HTMLButtonElement>(null)
    const engineMenuContainerRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭模型菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowModelMenu(false)
            }
            // 检查点击是否在引擎菜单触发按钮或菜单容器内
            const isEngineMenuClick =
                (engineMenuRef.current && engineMenuRef.current.contains(e.target as Node)) ||
                (engineMenuContainerRef.current && engineMenuContainerRef.current.contains(e.target as Node))
            if (!isEngineMenuClick) {
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

    return (
        <div className="chat-panel-v2">
            {/* 消息区域 */}
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <Sparkles size={32} strokeWidth={1.2} />
                        <p>{t('chat.title')}</p>
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
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 底部区域 */}
            <div className="chat-footer">
                {/* 状态栏 */}
                <div className="chat-status-bar">
                    <div className="chat-model-info" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* 引擎按钮 */}
                        {engineStore && (
                            <button
                                className="engine-type-btn"
                                onClick={() => {
                                    if (engineMenuRef.current) {
                                        const rect = engineMenuRef.current.getBoundingClientRect()
                                        setEngineMenuPosition({
                                            left: rect.left,
                                            bottom: window.innerHeight - rect.top + 8
                                        })
                                    }
                                    setShowEngineMenu(!showEngineMenu)
                                }}
                                ref={engineMenuRef}
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
                                    e.currentTarget.style.borderColor = 'var(--accent)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)'
                                    e.currentTarget.style.borderColor = 'var(--border-color)'
                                }}
                            >
                                {engineStore.currentEngine === 'webllm' && (
                                    <>
                                        <Bot size={14} />
                                        <span>内置</span>
                                    </>
                                )}
                                {engineStore.currentEngine === 'ollama' && (
                                    <>
                                        <Server size={14} />
                                        <span>外部</span>
                                    </>
                                )}
                                {engineStore.currentEngine === 'openai' && (
                                    <>
                                        <Cloud size={14} />
                                        <span>云端</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* 引擎切换下拉菜单 */}
                        {engineStore && showEngineMenu && engineMenuPosition && createPortal(
                            <div
                                className="model-dropdown"
                                ref={engineMenuContainerRef}
                                style={{
                                    left: `${engineMenuPosition.left}px`,
                                    bottom: `${engineMenuPosition.bottom}px`,
                                    right: 'auto',
                                    transform: 'none'
                                }}
                            >
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 8px', fontWeight: 600 }}>
                                    AI 引擎
                                </div>
                                {[
                                    { type: 'webllm' as const, icon: <Bot size={14} />, label: '内置 WebLLM' },
                                    { type: 'ollama' as const, icon: <Server size={14} />, label: '外部 Ollama' },
                                    { type: 'openai' as const, icon: <Cloud size={14} />, label: '云端 Cloud API' }
                                ].map((engine) => (
                                    <button
                                        key={engine.type}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            engineStore.setEngine(engine.type)

                                            // WebLLM 自动初始化逻辑（与设置页面一致）
                                            if (engine.type === 'webllm') {
                                                const savedModel = localStorage.getItem('zen-selected-webllm-model')
                                                const targetModel = savedModel || ALL_WEBLLM_MODELS_INFO[0]?.model_id

                                                if (!engineStore.webllmReady && !engineStore.webllmLoading && targetModel) {
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
                                            padding: '8px',
                                            background: engineStore.currentEngine === engine.type ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            color: engineStore.currentEngine === engine.type ? 'var(--accent)' : 'var(--text-primary)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {engine.icon}
                                        <span>{engine.label}</span>
                                        {engineStore.currentEngine === engine.type && <Check size={12} style={{ marginLeft: 'auto' }} />}
                                    </button>
                                ))}
                            </div>,
                            document.body
                        )}



                        {/* 模型按钮 / 状态显示 */}
                        {status === 'ready' ? (
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
                                            gap: '6px',
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
                                            e.currentTarget.style.borderColor = 'var(--accent)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-hover)'
                                            e.currentTarget.style.borderColor = 'var(--border-color)'
                                        }}
                                    >
                                        {formatModelName(selectedOllamaModel || modelName)}
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
                                                    const recommendedModel = RECOMMENDED_MODELS.find(m => m.name === model.name)
                                                    const isBuiltIn = recommendedModel?.builtIn
                                                    const isExpanded = expandedModel === model.name
                                                    return (
                                                        <div
                                                            key={model.name}
                                                            className={`model-item ${isCurrentModel ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}
                                                        >
                                                            <div className="model-item-row">
                                                                <div
                                                                    className="model-item-left clickable"
                                                                    onClick={() => setExpandedModel(isExpanded ? null : model.name)}
                                                                >
                                                                    <span className="model-item-name">{formatModelName(model.name)}</span>
                                                                    {isBuiltIn && <span className="model-badge builtin">{t('chat.builtIn')}</span>}
                                                                    {model.formattedSize && (
                                                                        <span className="model-item-size">{model.formattedSize}</span>
                                                                    )}
                                                                </div>
                                                                <div className="model-item-right">
                                                                    {isCurrentModel ? (
                                                                        <span className="model-tag active">
                                                                            <Check size={10} /> {t('chat.inUse')}
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                className="model-use-btn"
                                                                                onClick={() => {
                                                                                    setSelectedOllamaModel(model.name)
                                                                                    setShowModelMenu(false)
                                                                                }}
                                                                            >
                                                                                {t('settings.useThis')}
                                                                            </button>

                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isExpanded && recommendedModel && (
                                                                <div className="model-tagline">{t(recommendedModel.taglineKey)}</div>
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
                                <div className="model-status-btn" style={{
                                    padding: '6px 10px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)'
                                }}>
                                    {engineStore.selectedModel ? formatModelName(engineStore.selectedModel.split('/').pop() || '') : 'WebLLM'}
                                </div>
                            ) : engineStore?.currentEngine === 'openai' ? (
                                <div className="model-status-btn" style={{
                                    padding: '6px 10px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)'
                                }}>
                                    {engineStore.cloudConfig?.modelName || 'Cloud API'}
                                </div>
                            ) : (
                                <span className="model-label">{formatModelName(modelName)}</span>
                            )
                        ) : status === 'loading' ? (
                            <div className="model-loading-status">
                                <span className="loading-text">
                                    {loadProgress ? `${t('chat.loading', '正在加载')} ${Math.round(loadProgress.progress * 100)}%` : t('chat.loading')}
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
                        ) : status === 'error' ||
                            (engineStore?.currentEngine === 'ollama' && !engineStore.ollamaAvailable) ||
                            (engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus !== 'success') ? (
                            <div className={`status-btn ${(engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus === 'error') ||
                                (engineStore?.currentEngine === 'ollama' && !engineStore.ollamaAvailable)
                                ? 'error'
                                : engineStore?.currentEngine === 'openai' && engineStore.cloudApiStatus === 'untested'
                                    ? 'untested'
                                    : 'disconnected'
                                }`} style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    cursor: 'default',
                                    pointerEvents: 'none'
                                }}>
                                <span className="status-indicator" />
                                <span className="status-text">
                                    {engineStore?.currentEngine === 'openai'
                                        ? (engineStore.cloudApiStatus === 'error' ? '连接失败' : '未测试')
                                        : '连接失败'}
                                </span>
                            </div>
                        ) : null}
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
