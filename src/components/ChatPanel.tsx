import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Send, Square, Sparkles, Check, Download, Trash2 } from 'lucide-react'
import { ChatMessage } from '../services/types'
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
    // 保护代码块：将 <code>...</code> 和 <pre>...</pre> 替换为占位符
    const codeBlocks: string[] = []
    html = html.replace(/(<code[^>]*>[\s\S]*?<\/code>)|(<pre[^>]*>[\s\S]*?<\/pre>)/gi, (match) => {
        codeBlocks.push(match)
        return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })

    // 渲染块级公式 $$...$$
    html = html.replace(/\$\$([^$]+)\$\$/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false })
        } catch {
            return formula
        }
    })

    // 渲染行内公式 $...$
    html = html.replace(/\$([^$\n]+)\$/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false })
        } catch {
            return formula
        }
    })

    // 还原代码块
    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
        return codeBlocks[parseInt(index)]
    })

    return html
}

interface ChatPanelProps {
    llm: UseLLMReturn
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm }) => {
    const { t } = useTranslation()

    // 模型信息翻译映射
    const getModelSpeed = (modelId: string): string => {
        const speedMap: Record<string, string> = {
            'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': t('model.speedUltraFast'),
            'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': t('model.speedUltraFast'),
            'gemma-2-2b-it-q4f16_1-MLC': t('model.speedVeryFast'),
            'Llama-3.2-3B-Instruct-q4f16_1-MLC': t('model.speedVeryFast'),
            'Qwen2.5-3B-Instruct-q4f16_1-MLC': t('model.speedFast'),
            'Phi-3.5-mini-instruct-q4f16_1-MLC': t('model.speedSlow'),
        }
        return speedMap[modelId] || t('model.speedFast')
    }

    const getModelUseCase = (modelId: string): string => {
        const useCaseMap: Record<string, string> = {
            'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': t('model.useCaseSimple'),
            'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': t('model.useCaseBestValue'),
            'gemma-2-2b-it-q4f16_1-MLC': t('model.useCaseCreative'),
            'Llama-3.2-3B-Instruct-q4f16_1-MLC': t('model.useCaseBusiness'),
            'Qwen2.5-3B-Instruct-q4f16_1-MLC': t('model.useCaseMainChinese'),
            'Phi-3.5-mini-instruct-q4f16_1-MLC': t('model.useCaseLogic'),
        }
        return useCaseMap[modelId] || ''
    }

    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const {
        providerType,
        status,
        modelName,
        loadProgress,
        errorMessage: _errorMessage,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel,
        webllmModels,
        selectedWebLLMModel,
        setSelectedWebLLMModel,
        downloadedModels,
        deleteModel,
        messages,
        isGenerating,
        contextType: _contextType,
        activeFileName: _activeFileName,
        activeFolderName: _activeFolderName,
        sendMessage,
        abortGeneration,
        retryDetection
    } = llm

    const [showModelMenu, setShowModelMenu] = useState(false)
    const [downloadingModel, setDownloadingModel] = useState<string | null>(null)
    const [expandedModel, setExpandedModel] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // 点击外部关闭模型菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                // 正在下载时不关闭
                if (!downloadingModel) {
                    setShowModelMenu(false)
                }
            }
        }
        if (showModelMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showModelMenu, downloadingModel])

    // 获取当前流式消息的内容长度，用于触发滚动
    const streamingContent = messages.find(m => m.isStreaming)?.content || ''

    useEffect(() => {
        // 每当消息变化或流式内容更新时，滚动到底部
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    }, [messages, streamingContent])

    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating || status !== 'ready') return
        const message = inputValue
        setInputValue('')
        // 重置输入框高度
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
        // 重置高度为最小值，让 scrollHeight 正确计算
        textarea.style.height = '20px'
        // 根据内容调整高度，但不超过最大值
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 20), 100)
        textarea.style.height = `${newHeight}px`
    }

    const formatModelName = (name: string) => {
        const base = name.split(':')[0]
        return base.charAt(0).toUpperCase() + base.slice(1)
    }

    return (
        <div className="chat-panel-v2">
            {/* 消息区域（占据大部分空间） */}
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
                        {/* AI 等待动画 - 当正在生成且没有流式消息时显示 */}
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
                {/* 状态栏：模型选择靠左 */}
                <div className="chat-status-bar">

                    {/* AI 状态呼吸灯 */}
                    <div className="chat-model-info">
                        <div className={`ai-status-indicator ${isGenerating || status === 'loading' ? 'active' : 'idle'}`}>
                            <span className="indicator-dot"></span>
                            <span className="indicator-glow"></span>
                        </div>
                        {status === 'ready' ? (
                            isGenerating ? (
                                <span className="model-label thinking">{t('chat.thinking')}</span>
                            ) : providerType === 'ollama' && ollamaModels.length >= 1 ? (
                                <div className="webllm-model-selector" ref={menuRef}>
                                    <button
                                        className="model-label clickable"
                                        onClick={() => setShowModelMenu(!showModelMenu)}
                                    >
                                        {formatModelName(selectedOllamaModel || modelName)}
                                    </button>
                                    {showModelMenu && createPortal(
                                        <div className="model-dropdown" ref={menuRef}>
                                            {/* Ollama 头部提示 */}
                                            <div className="model-dropdown-header">
                                                <span className="header-icon">🔗</span>
                                                <span>{t('chat.ollamaConnected')}</span>
                                            </div>
                                            {ollamaModels.map((model) => {
                                                const isCurrentModel = model.name === selectedOllamaModel
                                                return (
                                                    <div
                                                        key={model.name}
                                                        className={`model-item ${isCurrentModel ? 'active' : ''}`}
                                                    >
                                                        <div className="model-item-row">
                                                            <div className="model-item-left">
                                                                <span className="model-item-name">{formatModelName(model.name)}</span>
                                                            </div>
                                                            <div className="model-item-right">
                                                                {isCurrentModel ? (
                                                                    <span className="model-tag active">
                                                                        <Check size={10} /> {t('chat.inUse')}
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        className="model-use-btn"
                                                                        onClick={() => {
                                                                            setSelectedOllamaModel(model.name)
                                                                            setShowModelMenu(false)
                                                                        }}
                                                                    >
                                                                        <span className="btn-default">{t('chat.downloaded')}</span>
                                                                        <span className="btn-hover">{t('chat.use')}</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            ) : providerType === 'webllm' ? (
                                <div className="webllm-model-selector" ref={menuRef}>
                                    <button
                                        className="model-label clickable"
                                        onClick={() => setShowModelMenu(!showModelMenu)}
                                    >
                                        {webllmModels.find(m => m.id === selectedWebLLMModel)?.name || formatModelName(modelName)}
                                    </button>
                                    {showModelMenu && createPortal(
                                        <div className="model-dropdown" ref={menuRef}>
                                            {webllmModels.map((model) => {
                                                const isCurrentModel = model.id === selectedWebLLMModel
                                                const isDownloading = downloadingModel === model.id
                                                const isExpanded = expandedModel === model.id
                                                const downloadProgress = isDownloading ? (loadProgress?.progress || 0) : 0

                                                return (
                                                    <div
                                                        key={model.id}
                                                        className={`model-item ${isCurrentModel ? 'active' : ''}`}
                                                    >
                                                        {/* 主行：名称 + 尺寸 + 状态按钮 */}
                                                        <div className="model-item-row">
                                                            <div
                                                                className="model-item-left"
                                                                onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                                                            >
                                                                <span className="model-item-name">{model.name}</span>
                                                                <span className="model-item-size">{model.size}</span>
                                                                {model.isBuiltin && <span className="model-tag builtin">{t('guide.builtIn')}</span>}
                                                            </div>

                                                            <div className="model-item-right">
                                                                {isDownloading ? (
                                                                    <div className="model-download-progress">
                                                                        <div className="progress-bar">
                                                                            <div
                                                                                className="progress-fill"
                                                                                style={{ width: `${downloadProgress}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="progress-text">{downloadProgress}%</span>
                                                                    </div>
                                                                ) : isCurrentModel ? (
                                                                    <span className="model-tag active">
                                                                        <Check size={10} /> {t('chat.inUse')}
                                                                    </span>
                                                                ) : downloadedModels.has(model.id) ? (
                                                                    <button
                                                                        className="model-use-btn"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            await setSelectedWebLLMModel(model.id)
                                                                        }}
                                                                    >
                                                                        <span className="btn-default">{t('chat.downloaded')}</span>
                                                                        <span className="btn-hover">{t('chat.use')}</span>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="model-download-btn"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            setDownloadingModel(model.id)
                                                                            await setSelectedWebLLMModel(model.id)
                                                                            setDownloadingModel(null)
                                                                        }}
                                                                    >
                                                                        <Download size={12} /> {t('chat.download')}
                                                                    </button>
                                                                )}

                                                                {/* 删除按钮 - 非内置模型且已下载 */}
                                                                {!model.isBuiltin && downloadedModels.has(model.id) && !isCurrentModel && !isDownloading && (
                                                                    <button
                                                                        className="model-delete-btn"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation()
                                                                            await deleteModel(model.id)
                                                                        }}
                                                                        title={t('chat.deleteModel')}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 展开详情 */}
                                                        {isExpanded && (
                                                            <div className="model-item-details">
                                                                <span className="detail-speed">{getModelSpeed(model.id)}</span>
                                                                <span className="detail-use">{getModelUseCase(model.id)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            ) : (
                                <span className="model-label">{formatModelName(modelName)}</span>
                            )
                        ) : status === 'loading' ? (
                            <div className="model-loading-status">
                                <span className="loading-text">{t('chat.loading')}</span>
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
        ? message.content.replace(/\n/g, '<br/>') // 用户消息简单换行
        : renderLatex(marked(message.content) as string) // AI 消息使用 Markdown + LaTeX

    // 净化 HTML
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
