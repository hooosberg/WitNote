/**
 * 状态指示器组件
 * 极简设计：呼吸灯圆点 + Tooltip
 */

import React, { useState } from 'react';
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
}) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // 获取状态点的样式类
    const getDotClass = () => {
        if (status === 'loading' || status === 'detecting') return 'loading';
        if (status === 'error') return 'error';
        return providerType;
    };

    // 获取 Tooltip 文字
    const getTooltipText = () => {
        switch (status) {
            case 'detecting':
                return '正在检测...';
            case 'loading':
                return '加载模型中...';
            case 'error':
                return '引擎错误';
            case 'ready':
                return providerType === 'ollama'
                    ? `Ollama: ${modelName}`
                    : `内置模型`;
            default:
                return '准备中';
        }
    };

    // 简化模型名称
    const formatModelName = (name: string) => {
        if (name.includes('gemma')) return 'Gemma';
        if (name.includes('qwen')) return 'Qwen';
        if (name.includes('llama')) return 'Llama';
        // 截取冒号前的部分
        const baseName = name.split(':')[0];
        return baseName.charAt(0).toUpperCase() + baseName.slice(1);
    };

    return (
        <div className="status-indicator">
            <div className="status-left">
                {/* 呼吸灯圆点 */}
                <div
                    className={`status-dot ${getDotClass()}`}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    {showTooltip && (
                        <div className="status-tooltip">
                            {getTooltipText()}
                        </div>
                    )}
                </div>
            </div>

            {/* 模型选择器 (仅 Ollama 且 ready 时显示) */}
            {status === 'ready' && providerType === 'ollama' && ollamaModels.length > 1 && (
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
            )}
        </div>
    );
};

export default StatusIndicator;
