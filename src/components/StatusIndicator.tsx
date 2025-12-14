/**
 * 状态指示器组件
 * 显示当前 AI 引擎状态和模型选择
 */

import React from 'react';
import { LLMProviderType, LLMStatus, OllamaModel, LoadProgress } from '../services/types';

interface StatusIndicatorProps {
    providerType: LLMProviderType;
    status: LLMStatus;
    modelName: string;
    ollamaModels: OllamaModel[];
    selectedModel: string;
    onModelChange: (model: string) => void;
    loadProgress: LoadProgress | null;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    providerType,
    status,
    modelName,
    ollamaModels,
    selectedModel,
    onModelChange,
    loadProgress
}) => {
    // 获取状态点的样式类
    const getDotClass = () => {
        if (status === 'loading' || status === 'detecting') return 'loading';
        if (status === 'error') return 'error';
        return providerType;
    };

    // 获取状态标签
    const getStatusLabel = () => {
        switch (status) {
            case 'detecting':
                return '正在探测...';
            case 'loading':
                return '正在加载模型...';
            case 'error':
                return '引擎错误';
            case 'ready':
                return providerType === 'ollama' ? '本地核心' : '内置核心';
            default:
                return '准备中';
        }
    };

    // 格式化模型名称显示
    const formatModelName = (name: string) => {
        // 简化 WebLLM 模型名
        if (name.includes('gemma')) {
            return 'Gemma 2B';
        }
        // 简化 Ollama 模型名
        const parts = name.split(':');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    };

    return (
        <div className="status-indicator">
            <div className="status-info">
                <span className={`status-dot ${getDotClass()}`} />
                <span className="status-label">{getStatusLabel()}</span>

                {status === 'ready' && (
                    <>
                        <span className="status-model">
                            {providerType === 'ollama' && ollamaModels.length > 1 ? (
                                <div className="model-selector">
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => onModelChange(e.target.value)}
                                    >
                                        {ollamaModels.map((model) => (
                                            <option key={model.name} value={model.name}>
                                                {formatModelName(model.name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                formatModelName(modelName)
                            )}
                        </span>
                    </>
                )}
            </div>

            {/* 加载进度 */}
            {status === 'loading' && loadProgress && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {loadProgress.progress}%
                </div>
            )}
        </div>
    );
};

export default StatusIndicator;
