/**
 * 上下文指示器
 * 咖啡杯图标（阅读模式）+ 文件夹线稿图标
 */

import React from 'react'
import { Coffee, Folder } from 'lucide-react'

interface ContextIndicatorProps {
    fileName?: string | null
    folderName?: string | null
    contextType?: 'file' | 'folder' | null
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({
    fileName,
    folderName,
    contextType
}) => {
    if (!contextType) return null

    if (contextType === 'file' && fileName) {
        return (
            <div className="context-indicator">
                <Coffee size={12} strokeWidth={1.5} />
                <span>阅读：</span>
                <span className="context-name">{fileName}</span>
            </div>
        )
    }

    if (contextType === 'folder' && folderName) {
        return (
            <div className="context-indicator">
                <Folder size={12} strokeWidth={1.5} />
                <span>在看文件夹：</span>
                <span className="context-name">{folderName}</span>
            </div>
        )
    }

    return null
}

export default ContextIndicator
