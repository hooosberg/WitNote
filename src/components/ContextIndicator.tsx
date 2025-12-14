/**
 * 上下文指示器组件
 * 极简设计：淡化的胶囊样式
 */

import React from 'react'

interface ContextIndicatorProps {
    fileName: string | null
    folderName: string | null
    contextType: 'file' | 'folder' | null
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
    fileName,
    folderName,
    contextType
}) => {
    if (!contextType) return null

    return (
        <div className="context-indicator">
            <span className="context-icon">
                {contextType === 'file' ? '👁️' : '📂'}
            </span>
            <span className="context-label">
                {contextType === 'file' ? 'Reading:' : 'Focused:'}
            </span>
            <span className="context-filename">
                {contextType === 'file' ? fileName : folderName}
            </span>
        </div>
    )
}

export default ContextIndicator
