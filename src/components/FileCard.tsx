/**
 * Glass Gallery 文件卡片
 * 4:3 画框风格 + 颜色边框系统 + 拖拽支持
 */

import React, { useState } from 'react'
import { Folder, FileText, FileCode, Eye, File } from 'lucide-react'
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

        // PDF 文件 - 使用眼睛图标表示只读
        if (ext === '.pdf') {
            return (
                <div style={{ position: 'relative' }}>
                    <File size={32} strokeWidth={1.2} />
                    <Eye size={16} strokeWidth={2} style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        background: 'var(--bg-card)',
                        borderRadius: '50%',
                        padding: 2
                    }} />
                </div>
            )
        }

        // DOCX 文件 - 使用文档+眼睛图标
        if (ext === '.docx') {
            return (
                <div style={{ position: 'relative' }}>
                    <FileText size={32} strokeWidth={1.2} />
                    <Eye size={16} strokeWidth={2} style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        background: 'var(--bg-card)',
                        borderRadius: '50%',
                        padding: 2
                    }} />
                </div>
            )
        }

        // Markdown 文件
        if (ext === 'md' || ext === '.md' || ext === '.markdown') {
            return <FileCode size={32} strokeWidth={1.2} />
        }

        // 其他文本文件
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

    // 根据颜色生成边框和背景样式 - 大幅增强可见度以透过模糊玻璃
    const cardStyle = color !== 'none' ? {
        borderColor: colorHex,
        borderWidth: '3px', // 加粗边框
        backgroundColor: `${colorHex}66`, // 40% 不透明度 - 大幅增强
        borderTop: `6px solid ${colorHex}`, // 更粗的顶部色带
        boxShadow: `0 4px 16px ${colorHex}59`, // 35% 不透明度阴影
    } : {}

    // 获取文件类型水印字母
    const getWatermark = () => {
        const ext = node.extension?.toLowerCase()
        if (ext === '.pdf') return 'P'
        if (ext === '.docx') return 'W'
        return null
    }

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

            {/* 文件类型水印 */}
            {getWatermark() && (
                <div className="file-type-watermark">
                    {getWatermark()}
                </div>
            )}
        </div>
    )
}

export default FileCard
