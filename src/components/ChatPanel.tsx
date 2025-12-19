import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Send, Square, Sparkles, Check, Download, Trash2, Settings } from 'lucide-react'
import { ChatMessage, RECOMMENDED_MODELS } from '../services/types'
import { UseLLMReturn } from '../hooks/useLLM'
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
    openSettings?: () => void
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm, openSettings }) => {
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
        abortGeneration,
        retryDetection,
        pullModel,
        deleteModel,
        cancelPull,
        downloadProgressMap
    } = llm

    const [showModelMenu, setShowModelMenu] = useState(false)
    const [expandedModel, setExpandedModel] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭模型菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowModelMenu(false)
            }
        }
        if (showModelMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showModelMenu])

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
                    <div className="chat-model-info">
                        <div className={`ai-status-indicator ${isGenerating || status === 'loading' ? 'active' : 'idle'}`}>
                            <span className="indicator-dot"></span>
                            <span className="indicator-glow"></span>
                        </div>
                        {status === 'ready' ? (
                            isGenerating ? (
                                <span className="model-label thinking">{t('chat.thinking')}</span>
                            ) : ollamaModels.length >= 1 ? (
                                <div className="webllm-model-selector" ref={menuRef}>
                                    <button
                                        className="model-label clickable"
                                        onClick={() => setShowModelMenu(!showModelMenu)}
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
                                                                            {!isBuiltIn && (
                                                                                <button
                                                                                    className="model-delete-btn"
                                                                                    onClick={() => deleteModel(model.name)}
                                                                                    title={t('settings.deleteModel')}
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            )}
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

                                            {/* 推荐模型 */}
                                            <div className="model-section">
                                                <div className="model-section-title">{t('settings.recommendedModels')}</div>
                                                {RECOMMENDED_MODELS.filter(rm => !ollamaModels.find(m => m.name === rm.name)).map((model) => {
                                                    const isDownloading = downloadProgressMap.has(model.name)
                                                    const progress = downloadProgressMap.get(model.name)
                                                    const isExpanded = expandedModel === model.name
                                                    return (
                                                        <div key={model.name} className={`model-item recommended ${isExpanded ? 'expanded' : ''}`}>
                                                            <div className="model-item-row">
                                                                <div
                                                                    className="model-item-left clickable"
                                                                    onClick={() => setExpandedModel(isExpanded ? null : model.name)}
                                                                >
                                                                    <span className="model-item-name">{formatModelName(model.name)}</span>
                                                                    <span className="model-item-desc">{model.size}</span>
                                                                </div>
                                                                <div className="model-item-right">
                                                                    {isDownloading ? (
                                                                        <div className="model-download-progress">
                                                                            <div className="progress-bar">
                                                                                <div
                                                                                    className="progress-fill"
                                                                                    style={{ width: `${progress?.progress || 0}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="progress-text">{progress?.progress || 0}%</span>
                                                                            <button
                                                                                className="model-cancel-btn"
                                                                                onClick={() => cancelPull(model.name)}
                                                                                title={t('models.cancelDownload')}
                                                                            >
                                                                                <Square size={10} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            className="model-download-btn"
                                                                            onClick={() => pullModel(model.name)}
                                                                        >
                                                                            <Download size={12} />
                                                                            {t('settings.download')}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className="model-tagline">{t(model.taglineKey)}</div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* 更多模型链接 */}
                                            <div
                                                className="model-more-link"
                                                onClick={() => {
                                                    setShowModelMenu(false)
                                                    openSettings?.()
                                                }}
                                            >
                                                <Settings size={12} />
                                                <span>{t('chat.moreModels')}</span>
                                            </div>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            ) : (
                                <span className="model-label">{formatModelName(modelName)}</span>
                            )
                        ) : status === 'loading' ? (
                            <div className="model-loading-status">
                                <span className="loading-text">
                                    {loadProgress ? `${t('chat.loadingModel')} ${loadProgress.progress}%` : t('chat.loading')}
                                </span>
                                {loadProgress && (
                                    <div className="loading-progress-bar">
                                        <div
                                            className="loading-progress-fill"
                                            style={{ width: `${loadProgress.progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : status === 'error' ? (
                            <button className="retry-btn" onClick={retryDetection}>
                                {t('chat.retry')}
                            </button>
                        ) : (
                            <span className="model-label">{t('chat.detecting')}</span>
                        )}
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
