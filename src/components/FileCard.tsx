/**
 * Glass Gallery 文件卡片
 * 4:3 画框风格 + 颜色边框系统
 */

import React from 'react'
import { Folder, FileText, FileCode } from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'
import { TAG_COLORS, TagColor } from '../hooks/useColorTags'

interface FileCardProps {
    node: FileNode
    color: TagColor
    onClick: () => void
    onContextMenu: (e: React.MouseEvent) => void
}

export const FileCard: React.FC<FileCardProps> = ({
    node,
    color,
    onClick,
    onContextMenu
}) => {
    const colorStyles = TAG_COLORS[color]

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

    return (
        <div
            className={`file-card-glass ${colorStyles.border} ${colorStyles.bg}`}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* 图标 + 名称 */}
            <div className="card-center">
                <div className={`card-icon ${colorStyles.icon}`}>
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
