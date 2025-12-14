/**
 * Finder 风格文件树
 * 修复：右键菜单全局单例 + 点击外部关闭
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    FileText,
    FileCode
} from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'

// 全局右键菜单状态
interface ContextMenuState {
    show: boolean
    x: number
    y: number
    node: FileNode | null
}

interface FileTreeProps {
    nodes: FileNode[]
    activeFilePath: string | null
    onFileSelect: (node: FileNode) => void
    onRename?: (node: FileNode) => void
    onDelete?: (node: FileNode) => void
}

export const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    activeFilePath,
    onFileSelect,
    onRename,
    onDelete
}) => {
    // 全局单例右键菜单
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        show: false,
        x: 0,
        y: 0,
        node: null
    })

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.show) {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [contextMenu.show])

    // 打开右键菜单
    const openContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            node
        })
    }, [])

    // 菜单操作
    const handleMenuAction = (action: 'rename' | 'delete') => {
        const node = contextMenu.node
        setContextMenu({ show: false, x: 0, y: 0, node: null })

        if (node) {
            if (action === 'rename' && onRename) {
                onRename(node)
            } else if (action === 'delete' && onDelete) {
                onDelete(node)
            }
        }
    }

    return (
        <div className="finder-tree">
            {nodes.map((node) => (
                <FileTreeItem
                    key={node.path}
                    node={node}
                    activeFilePath={activeFilePath}
                    onFileSelect={onFileSelect}
                    onContextMenu={openContextMenu}
                    level={0}
                />
            ))}

            {/* 全局单例右键菜单 */}
            {contextMenu.show && contextMenu.node && (
                <div
                    className="finder-context-menu"
                    style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button onClick={() => handleMenuAction('rename')}>
                        重命名
                    </button>
                    <button onClick={() => handleMenuAction('delete')} className="danger">
                        删除
                    </button>
                </div>
            )}
        </div>
    )
}

interface FileTreeItemProps {
    node: FileNode
    activeFilePath: string | null
    onFileSelect: (node: FileNode) => void
    onContextMenu: (e: React.MouseEvent, node: FileNode) => void
    level: number
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node,
    activeFilePath,
    onFileSelect,
    onContextMenu,
    level
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 1)

    const isActive = activeFilePath === node.path
    const hasChildren = node.isDirectory && node.children && node.children.length > 0

    // 计算文件数量
    const getFileCount = (): number => {
        if (!node.isDirectory || !node.children) return 0
        return node.children.filter(c => !c.isDirectory).length
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.isDirectory) {
            setIsExpanded(!isExpanded)
        }
        onFileSelect(node)
    }

    // 图标
    const getIcon = () => {
        if (node.isDirectory) {
            return isExpanded ? (
                <FolderOpen size={16} strokeWidth={1.5} />
            ) : (
                <Folder size={16} strokeWidth={1.5} />
            )
        }
        const ext = node.extension?.toLowerCase()
        if (ext === 'md' || ext === '.md') {
            return <FileCode size={16} strokeWidth={1.5} />
        }
        return <FileText size={16} strokeWidth={1.5} />
    }

    const fileCount = getFileCount()

    return (
        <div className="finder-tree-node">
            <div
                className={`finder-tree-item ${isActive ? 'active' : ''}`}
                onClick={handleClick}
                onContextMenu={(e) => onContextMenu(e, node)}
                style={{ paddingLeft: `${12 + level * 16}px` }}
            >
                {/* Chevron */}
                <span className={`finder-chevron ${!hasChildren ? 'invisible' : ''}`}>
                    {isExpanded ? (
                        <ChevronDown size={12} strokeWidth={2} />
                    ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                    )}
                </span>

                {/* Icon */}
                <span className="finder-icon">{getIcon()}</span>

                {/* Name */}
                <span className="finder-name">{node.name}</span>

                {/* Spacer */}
                <span className="finder-spacer" />

                {/* Count */}
                {node.isDirectory && fileCount > 0 && (
                    <span className="finder-count">{fileCount}</span>
                )}
            </div>

            {/* 子节点 */}
            {node.isDirectory && isExpanded && node.children && (
                <div className="finder-tree-children">
                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            activeFilePath={activeFilePath}
                            onFileSelect={onFileSelect}
                            onContextMenu={onContextMenu}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileTree
