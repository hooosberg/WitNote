/**
 * 聊天面板组件
 * iMessage 风格的 AI 对话界面 + 极简状态设计
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../services/types';
import StatusIndicator from './StatusIndicator';
import ContextIndicator from './ContextIndicator';
import { UseLLMReturn } from '../hooks/useLLM';

interface ChatPanelProps {
    llm: UseLLMReturn;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ llm }) => {
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
        contextType,
        activeFileName,
        activeFolderName,
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

        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    };

    // 获取空状态提示文字
    const getEmptyStateText = () => {
        if (status === 'detecting' || status === 'loading') return '正在准备 AI 引擎...';
        if (status === 'error') return '请点击重试';
        if (contextType === 'file' && activeFileName) {
            return `正在阅读 "${activeFileName}"`;
        }
        if (contextType === 'folder' && activeFolderName) {
            return `浏览文件夹 "${activeFolderName}"`;
        }
        return '选择文件开始对话';
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
                folderName={activeFolderName}
                contextType={contextType}
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
                    padding: '12px 16px',
                    background: 'rgba(255, 69, 58, 0.08)',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#ff453a', marginBottom: '8px', fontSize: '12px' }}>
                        {errorMessage || '初始化失败'}
                    </div>
                    <button
                        onClick={retryDetection}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#007aff',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        重试
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
                            {getEmptyStateText()}
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
                        placeholder={status === 'ready' ? '输入消息...' : '等待就绪...'}
                        disabled={status !== 'ready'}
                        rows={1}
                    />

                    {isGenerating ? (
                        <button
                            className="send-button stop-button"
                            onClick={abortGeneration}
                            title="停止"
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
