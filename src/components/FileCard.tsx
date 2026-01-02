/**
 * Glass Gallery 文件卡片
 * 4:3 画框风格 + 颜色边框系统 + 拖拽支持
 */

import React, { useState } from 'react'
import { Folder, FileText, FileCode } from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'
import { TAG_COLORS, ColorKey } from '../hooks/useColorTags'

interface FileCardProps {
    node: FileNode
    color: ColorKey
    onClick: () => void
    onContextMenu: (e: React.MouseEvent) => void
    onDragStart?: (node: FileNode) => void  // 拖拽开始回调
}

export const FileCard: React.FC<FileCardProps> = ({
    node,
    color,
    onClick,
    onContextMenu,
    onDragStart
}) => {
    const colorConfig = TAG_COLORS.find(c => c.key === color)
    const colorHex = colorConfig?.hex || 'transparent'
    const [isDragging, setIsDragging] = useState(false)

    // 格式化日期
    const formatDate = (timestamp?: number) => {
        if (!timestamp) return '--'
        const date = new Date(timestamp)
        return `${date.getMonth() + 1}/${date.getDate()}`
    }

    // 获取图标
    const getIcon = () => {
        if (node.isDirectory) {
            return <Folder size={32} strokeWidth={1.2} />
        }
        const ext = node.extension?.toLowerCase()
        if (ext === 'md' || ext === '.md') {
            return <FileCode size={32} strokeWidth={1.2} />
        }
        return <FileText size={32} strokeWidth={1.2} />
    }

    // 获取文件名（不含扩展名）
    const displayName = node.isDirectory
        ? node.name
        : node.name.replace(/\.[^/.]+$/, '')

    // 拖拽事件处理
    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true)
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'file',
            path: node.path,
            name: node.name
        }))
        e.dataTransfer.effectAllowed = 'move'
        if (onDragStart) {
            onDragStart(node)
        }
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    // 根据颜色生成边框和背景样式
    const cardStyle = color !== 'none' ? {
        borderColor: colorHex,
        backgroundColor: `${colorHex}10`,
    } : {}

    return (
        <div
            className={`file-card-glass ${isDragging ? 'dragging' : ''}`}
            style={cardStyle}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* 图标 + 名称 */}
            <div className="card-center">
                <div className="card-icon" style={color !== 'none' ? { color: colorHex } : undefined}>
                    {getIcon()}
                </div>
                <div className="card-name">{displayName}</div>
            </div>

            {/* 元数据 */}
            <div className="card-meta">
                <span>Created: {formatDate(node.createdAt)}</span>
                <span>Modified: {formatDate(node.modifiedAt)}</span>
            </div>
        </div>
    )
}

export default FileCard
