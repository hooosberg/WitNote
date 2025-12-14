/**
 * Finder 风格文件树
 * 支持颜色标签 + 右键菜单
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    FileText,
    FileCode,
    Circle
} from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'
import { TAG_COLORS, TagColor } from '../hooks/useColorTags'

// 颜色点
const COLOR_OPTIONS: TagColor[] = ['none', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray']

interface ContextMenuState {
    show: boolean
    x: number
    y: number
    node: FileNode | null
    showColorPicker: boolean
}

interface FileTreeProps {
    nodes: FileNode[]
    activeFilePath: string | null
    onFileSelect: (node: FileNode) => void
    onRename?: (node: FileNode) => void
    onDelete?: (node: FileNode) => void
    getColorTag?: (path: string) => TagColor
    onColorChange?: (path: string, color: TagColor) => void
}

export const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    activeFilePath,
    onFileSelect,
    onRename,
    onDelete,
    getColorTag,
    onColorChange
}) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        show: false,
        x: 0,
        y: 0,
        node: null,
        showColorPicker: false
    })

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.finder-context-menu')) {
                setContextMenu(prev => ({ ...prev, show: false, node: null, showColorPicker: false }))
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setContextMenu(prev => ({ ...prev, show: false, node: null, showColorPicker: false }))
            }
        }

        if (contextMenu.show) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [contextMenu.show])

    const openContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            node,
            showColorPicker: false
        })
    }, [])

    const handleMenuAction = (action: 'open' | 'rename' | 'delete' | 'color') => {
        if (action === 'color') {
            setContextMenu(prev => ({ ...prev, showColorPicker: true }))
            return
        }

        const node = contextMenu.node
        setContextMenu({ show: false, x: 0, y: 0, node: null, showColorPicker: false })

        if (node) {
            if (action === 'open') {
                onFileSelect(node)
            } else if (action === 'rename' && onRename) {
                onRename(node)
            } else if (action === 'delete' && onDelete) {
                onDelete(node)
            }
        }
    }

    const handleColorSelect = (color: TagColor) => {
        if (contextMenu.node && onColorChange) {
            onColorChange(contextMenu.node.path, color)
        }
        setContextMenu({ show: false, x: 0, y: 0, node: null, showColorPicker: false })
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
                    getColorTag={getColorTag}
                    level={0}
                />
            ))}

            {/* 右键菜单 */}
            {contextMenu.show && contextMenu.node && (
                <div
                    className="finder-context-menu"
                    style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y
                    }}
                >
                    {!contextMenu.showColorPicker ? (
                        <>
                            <button onClick={() => handleMenuAction('open')}>打开</button>
                            <button onClick={() => handleMenuAction('rename')}>重命名</button>
                            <div className="menu-divider" />
                            <button onClick={() => handleMenuAction('color')}>
                                颜色标签
                                <span className="menu-arrow">›</span>
                            </button>
                            <div className="menu-divider" />
                            <button onClick={() => handleMenuAction('delete')} className="danger">删除</button>
                        </>
                    ) : (
                        <div className="color-picker">
                            {COLOR_OPTIONS.map(color => (
                                <button
                                    key={color}
                                    className="color-option"
                                    onClick={() => handleColorSelect(color)}
                                >
                                    {color === 'none' ? (
                                        <span className="color-dot none">✕</span>
                                    ) : (
                                        <Circle
                                            size={12}
                                            fill={`var(--color-${color})`}
                                            className={`color-dot ${color}`}
                                        />
                                    )}
                                    <span>{TAG_COLORS[color].name}</span>
                                </button>
                            ))}
                        </div>
                    )}
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
    getColorTag?: (path: string) => TagColor
    level: number
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node,
    activeFilePath,
    onFileSelect,
    onContextMenu,
    getColorTag,
    level
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 1)

    const isActive = activeFilePath === node.path
    const hasChildren = node.isDirectory && node.children && node.children.length > 0
    const color = getColorTag ? getColorTag(node.path) : 'none'
    const colorStyles = TAG_COLORS[color]

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
                <span className={`finder-chevron ${!hasChildren ? 'invisible' : ''}`}>
                    {isExpanded ? (
                        <ChevronDown size={12} strokeWidth={2} />
                    ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                    )}
                </span>

                <span className={`finder-icon ${colorStyles.icon}`}>{getIcon()}</span>

                <span className="finder-name">{node.name}</span>

                <span className="finder-spacer" />

                {node.isDirectory && fileCount > 0 && (
                    <span className="finder-count">{fileCount}</span>
                )}
            </div>

            {node.isDirectory && isExpanded && node.children && (
                <div className="finder-tree-children">
                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            activeFilePath={activeFilePath}
                            onFileSelect={onFileSelect}
                            onContextMenu={onContextMenu}
                            getColorTag={getColorTag}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileTree
