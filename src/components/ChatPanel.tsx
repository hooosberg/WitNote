/**
 * 聊天面板组件
 * iMessage 风格的 AI 对话界面
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../services/types';
import StatusIndicator from './StatusIndicator';
import ContextIndicator from './ContextIndicator';
import { UseLLMReturn } from '../hooks/useLLM';

interface ChatPanelProps {
    llm: UseLLMReturn;
    activeFileName: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm, activeFileName }) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
        sendMessage,
        abortGeneration,
        retryDetection
    } = llm;

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 处理发送
    const handleSend = async () => {
        if (!inputValue.trim() || isGenerating || status !== 'ready') return;

        const message = inputValue;
        setInputValue('');
        await sendMessage(message);
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 自动调整输入框高度
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);

        // 自动调整高度
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    return (
        <div className="chat-panel">
            {/* 状态指示器 */}
            <StatusIndicator
                providerType={providerType}
                status={status}
                modelName={modelName}
                ollamaModels={ollamaModels}
                selectedModel={selectedOllamaModel}
                onModelChange={setSelectedOllamaModel}
                loadProgress={loadProgress}
            />

            {/* 上下文指示器 */}
            <ContextIndicator
                fileName={activeFileName}
                isActive={!!activeFileName}
            />

            {/* 加载进度条 */}
            {status === 'loading' && loadProgress && (
                <div className="loading-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${loadProgress.progress}%` }}
                        />
                    </div>
                    <div className="progress-text">
                        {loadProgress.text}
                    </div>
                </div>
            )}

            {/* 错误状态 */}
            {status === 'error' && (
                <div className="error-state" style={{
                    padding: '16px',
                    background: 'rgba(255, 59, 48, 0.1)',
                    borderBottom: '1px solid rgba(255, 59, 48, 0.2)',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#ff3b30', marginBottom: '8px', fontSize: '13px' }}>
                        ❌ {errorMessage || 'AI 引擎初始化失败'}
                    </div>
                    <button
                        onClick={retryDetection}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#007aff',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        重新检测
                    </button>
                </div>
            )}

            {/* 消息区域 */}
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧘</div>
                        <div className="empty-state-title">禅意助手</div>
                        <div className="empty-state-desc">
                            {status === 'ready'
                                ? activeFileName
                                    ? `我已阅读 "${activeFileName}"，有什么可以帮您的？`
                                    : '选择一个文件，我可以帮您分析内容'
                                : status === 'error'
                                    ? '请点击上方按钮重试'
                                    : '正在准备 AI 引擎...'}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={status === 'ready' ? '输入消息...' : '等待引擎就绪...'}
                        disabled={status !== 'ready'}
                        rows={1}
                    />

                    {isGenerating ? (
                        <button
                            className="send-button stop-button"
                            onClick={abortGeneration}
                            title="停止生成"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="6" width="12" height="12" rx="1" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            className="send-button"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || status !== 'ready'}
                            title="发送消息"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 聊天气泡组件
interface ChatBubbleProps {
    message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
    return (
        <div className={`chat-bubble ${message.role}`}>
            <div className="chat-bubble-content">
                {message.content}
                {message.isStreaming && <span className="typing-cursor" />}
            </div>
        </div>
    );
};

export default ChatPanel;
