import React, { useState, useRef, useEffect } from 'react'
import { Send, Square, Sparkles, Brain, Coffee } from 'lucide-react'
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
    // ... 组件逻辑 ... (不再重复)

    const [inputValue, setInputValue] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const {
        providerType,
        status,
        modelName,
        loadProgress,
        errorMessage,
        ollamaModels,
        selectedOllamaModel,
        setSelectedOllamaModel,
        messages,
        isGenerating,
        contextType,
        activeFileName,
        activeFolderName,
        sendMessage,
        abortGeneration,
        retryDetection
    } = llm

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating || status !== 'ready') return
        const message = inputValue
        setInputValue('')
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
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`
    }

    const formatModelName = (name: string) => {
        const base = name.split(':')[0]
        return base.charAt(0).toUpperCase() + base.slice(1)
    }

    const getStatusClass = () => {
        if (status === 'loading' || status === 'detecting') return 'status-loading'
        if (status === 'error') return 'status-error'
        return providerType === 'ollama' ? 'status-ollama' : 'status-webllm'
    }

    return (
        <div className="chat-panel-v2">
            {/* 消息区域（占据大部分空间） */}
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <Sparkles size={32} strokeWidth={1.2} />
                        <p>AI 助手</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 底部区域 */}
            <div className="chat-footer">
                {/* 状态栏：左侧咖啡杯+上下文，右侧脑袋+模型选择 */}
                <div className="chat-status-bar">
                    {/* 左侧：咖啡杯 + 上下文提示 */}
                    <div className="chat-context-info">
                        <Coffee size={18} strokeWidth={1.5} className="context-coffee" />
                        <span className="context-text">
                            {contextType === 'file' && activeFileName
                                ? `我看到文章`
                                : contextType === 'folder' && activeFolderName
                                    ? `我看到文件夹`
                                    : contextType === 'folder' && !activeFolderName
                                        ? `我看到全部文件`
                                        : '选择文件或文件夹'}
                        </span>
                    </div>

                    {/* 右侧：脑袋 + 模型选择 */}
                    <div className="chat-model-info">
                        <Brain size={18} strokeWidth={1.5} className="model-brain" />
                        {status === 'ready' ? (
                            providerType === 'ollama' && ollamaModels.length > 1 ? (
                                <select
                                    className="model-select-inline"
                                    value={selectedOllamaModel}
                                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                                >
                                    {ollamaModels.map((model) => (
                                        <option key={model.name} value={model.name}>
                                            {formatModelName(model.name)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <span className="model-label">{formatModelName(modelName)}</span>
                            )
                        ) : status === 'loading' ? (
                            <span className="model-label">
                                Loading {loadProgress ? `${loadProgress.progress}%` : '...'}
                            </span>
                        ) : status === 'error' ? (
                            <button className="retry-btn" onClick={retryDetection}>
                                重试
                            </button>
                        ) : (
                            <span className="model-label">检测中...</span>
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
                        placeholder={status === 'ready' ? '有什么想法...' : '等待就绪...'}
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
                className="bubble-content markdown-body" // 添加 markdown-body 类以复用样式
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {message.isStreaming && <span className="typing-cursor" />}
        </div>
    )
}

export default ChatPanel
