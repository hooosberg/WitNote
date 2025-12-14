/**
 * 聊天面板 - 底部重心布局
 * 状态栏移到输入框上方，顶部留空
 */

import React, { useState, useRef, useEffect } from 'react'
import { Send, Square, Sparkles, Brain, Coffee } from 'lucide-react'
import { ChatMessage } from '../services/types'
import { UseLLMReturn } from '../hooks/useLLM'

interface ChatPanelProps {
    llm: UseLLMReturn
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm }) => {
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
                                ? `我已经看到你的这篇文章`
                                : contextType === 'folder' && activeFolderName
                                    ? `我已经看到这些文件夹的内容`
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
    return (
        <div className={`chat-bubble ${message.role}`}>
            <div className="bubble-content">
                {message.content}
                {message.isStreaming && <span className="typing-cursor" />}
            </div>
        </div>
    )
}

export default ChatPanel
