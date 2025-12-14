/**
 * Finder 风格文件树
 * 内联颜色菜单 + 颜色圆点指示器
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

// 颜色配置
const COLORS = [
    { key: 'none', hex: 'transparent', name: '无' },
    { key: 'red', hex: '#ff453a', name: '红' },
    { key: 'orange', hex: '#ff9500', name: '橙' },
    { key: 'yellow', hex: '#ffcc00', name: '黄' },
    { key: 'green', hex: '#30d158', name: '绿' },
    { key: 'blue', hex: '#007aff', name: '蓝' },
    { key: 'purple', hex: '#bf5af2', name: '紫' },
    { key: 'gray', hex: '#8e8e93', name: '灰' },
] as const

export type ColorKey = typeof COLORS[number]['key']

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
    getColor?: (path: string) => ColorKey
    onColorChange?: (path: string, color: ColorKey) => void
}

export const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    activeFilePath,
    onFileSelect,
    onRename,
    onDelete,
    getColor,
    onColorChange
}) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        show: false,
        x: 0,
        y: 0,
        node: null
    })

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.context-menu')) {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
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
        setContextMenu({ show: true, x: e.clientX, y: e.clientY, node })
    }, [])

    const closeMenu = () => {
        setContextMenu({ show: false, x: 0, y: 0, node: null })
    }

    const handleAction = (action: 'open' | 'rename' | 'delete') => {
        const node = contextMenu.node
        closeMenu()
        if (node) {
            if (action === 'open') onFileSelect(node)
            else if (action === 'rename' && onRename) onRename(node)
            else if (action === 'delete' && onDelete) onDelete(node)
        }
    }

    const handleColorClick = (color: ColorKey) => {
        if (contextMenu.node && onColorChange) {
            onColorChange(contextMenu.node.path, color)
        }
        closeMenu()
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
                    getColor={getColor}
                    level={0}
                />
            ))}

            {/* 右键菜单 - 内联颜色点 */}
            {contextMenu.show && contextMenu.node && (
                <div
                    className="context-menu"
                    style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <button onClick={() => handleAction('open')}>打开</button>
                    <button onClick={() => handleAction('rename')}>重命名</button>

                    {/* 内联颜色点 */}
                    <div className="color-dots">
                        {COLORS.map(c => (
                            <button
                                key={c.key}
                                className="color-dot"
                                style={{
                                    background: c.key === 'none' ? '#e5e5e5' : c.hex,
                                    border: c.key === 'none' ? '1px dashed #ccc' : 'none'
                                }}
                                onClick={() => handleColorClick(c.key)}
                                title={c.name}
                            />
                        ))}
                    </div>

                    <div className="menu-divider" />
                    <button onClick={() => handleAction('delete')} className="danger">删除</button>
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
    getColor?: (path: string) => ColorKey
    level: number
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node,
    activeFilePath,
    onFileSelect,
    onContextMenu,
    getColor,
    level
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 1)

    const isActive = activeFilePath === node.path
    const hasChildren = node.isDirectory && node.children && node.children.length > 0
    const color = getColor ? getColor(node.path) : 'none'
    const colorHex = COLORS.find(c => c.key === color)?.hex || 'transparent'

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

                <span className="finder-icon">{getIcon()}</span>

                <span className="finder-name">{node.name}</span>

                <span className="finder-spacer" />

                {/* 颜色圆点指示器 */}
                {color !== 'none' && (
                    <span
                        className="finder-color-dot"
                        style={{ background: colorHex }}
                    />
                )}

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
                            getColor={getColor}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileTree
