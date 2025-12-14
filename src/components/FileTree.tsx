/**
 * 递归文件树组件
 * 显示文件夹和文件，支持选中状态和重命名
 */

import React, { useState } from 'react'
import { FileNode } from '../hooks/useFileSystem'

interface FileTreeProps {
    nodes: FileNode[]
    activeFilePath: string | null
    onFileSelect: (node: FileNode) => void
    onRename?: (node: FileNode) => void
    level?: number
}

export const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    activeFilePath,
    onFileSelect,
    onRename,
    level = 0
}) => {
    return (
        <div className="file-tree" style={{ paddingLeft: level > 0 ? 12 : 0 }}>
            {nodes.map((node) => (
                <FileTreeNode
                    key={node.path}
                    node={node}
                    activeFilePath={activeFilePath}
                    onFileSelect={onFileSelect}
                    onRename={onRename}
                    level={level}
                />
            ))}
        </div>
    )
}

interface FileTreeNodeProps {
    node: FileNode
    activeFilePath: string | null
    onFileSelect: (node: FileNode) => void
    onRename?: (node: FileNode) => void
    level: number
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
    node,
    activeFilePath,
    onFileSelect,
    onRename,
    level
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 2)

    const isActive = activeFilePath === node.path

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.isDirectory) {
            onFileSelect(node)
        } else {
            onFileSelect(node)
        }
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.isDirectory) {
            setIsExpanded(!isExpanded)
        } else if (onRename) {
            onRename(node)
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        if (onRename) {
            onRename(node)
        }
    }

    // 获取文件图标
    const getIcon = () => {
        if (node.isDirectory) {
            return isExpanded || isActive ? '📂' : '📁'
        }
        const ext = node.extension?.toLowerCase()
        if (ext === '.md' || ext === 'md') {
            return '📝'
        }
        return '📄'
    }

    return (
        <div className="file-tree-node">
            <div
                className={`file-tree-item ${isActive ? 'active' : ''} ${node.isDirectory ? 'directory' : 'file'}`}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                style={{ paddingLeft: 8 }}
            >
                <span className="file-tree-icon">{getIcon()}</span>
                <span className="file-tree-name">{node.name}</span>
                {node.isDirectory && node.children && node.children.length > 0 && (
                    <span
                        className="folder-toggle"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsExpanded(!isExpanded)
                        }}
                    >
                        {isExpanded ? '▼' : '▶'}
                    </span>
                )}
            </div>

            {node.isDirectory && isExpanded && node.children && node.children.length > 0 && (
                <FileTree
                    nodes={node.children.filter(c => c.isDirectory)}
                    activeFilePath={activeFilePath}
                    onFileSelect={onFileSelect}
                    onRename={onRename}
                    level={level + 1}
                />
            )}
        </div>
    )
}

export default FileTree
