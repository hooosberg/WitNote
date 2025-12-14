/**
 * 上下文指示器组件
 * 显示 AI 正在读取的文件
 */

import React from 'react'

interface ContextIndicatorProps {
    fileName: string | null
    isActive: boolean
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
    fileName,
    isActive
}) => {
    if (!isActive || !fileName) {
        return null
    }

    return (
        <div className="context-indicator">
            <span className="context-icon">👁️</span>
            <span className="context-label">Reading:</span>
            <span className="context-filename">{fileName}</span>
        </div>
    )
}

export default ContextIndicator
