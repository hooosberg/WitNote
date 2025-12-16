/**
 * Finder 风格文件树
 * 只显示文件夹 + 红黄绿颜色标记
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    Plus,
    Minus
} from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'

// 颜色配置 - 红黄绿蓝
const COLORS = [
    { key: 'none', hex: 'transparent', name: '无' },
    { key: 'red', hex: '#ff453a', name: '红' },
    { key: 'yellow', hex: '#ffcc00', name: '黄' },
    { key: 'green', hex: '#30d158', name: '绿' },
    { key: 'blue', hex: '#007aff', name: '蓝' },
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
    onCreateFolder?: (inDirectory?: string) => void
    getColor?: (path: string) => ColorKey
    onColorChange?: (path: string, color: ColorKey) => void
    // 根目录相关
    rootName?: string
    isRootSelected?: boolean
    onRootSelect?: () => void
    // 内联编辑
    editingPath?: string | null
    onEditComplete?: (path: string, newName: string) => void
    onStartEdit?: (path: string) => void  // 开始编辑回调
}

export const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    activeFilePath,
    onFileSelect,
    onRename,
    onDelete,
    onCreateFolder,
    getColor,
    onColorChange,
    rootName,
    isRootSelected,
    onRootSelect,
    editingPath,
    onEditComplete,
    onStartEdit
}) => {
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        show: false,
        x: 0,
        y: 0,
        node: null
    })

    // 只显示文件夹
    const folderNodes = nodes.filter(n => n.isDirectory)

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

    const handleAction = (action: 'rename' | 'delete') => {
        const node = contextMenu.node
        closeMenu()
        if (node) {
            if (action === 'rename' && onRename) onRename(node)
            else if (action === 'delete' && onDelete) onDelete(node)
        }
    }

    const handleColorClick = (color: ColorKey) => {
        if (contextMenu.node && onColorChange) {
            const currentColor = getColor ? getColor(contextMenu.node.path) : 'none'
            // 如果已经是这个颜色，则取消标记
            if (currentColor === color) {
                onColorChange(contextMenu.node.path, 'none')
            } else {
                onColorChange(contextMenu.node.path, color)
            }
        }
        closeMenu()
    }

    // 获取当前节点的颜色
    const getCurrentColor = () => {
        if (!contextMenu.node || !getColor) return 'none'
        return getColor(contextMenu.node.path)
    }

    return (
        <div className="finder-tree">
            {/* 根目录项 */}
            {rootName && (
                <div
                    className={`finder-tree-item root-item ${isRootSelected ? 'active' : ''}`}
                    onClick={() => onRootSelect?.()}
                    style={{ paddingLeft: '12px' }}
                >
                    <span className="finder-icon">
                        <Folder size={16} strokeWidth={1.5} />
                    </span>
                    <span className="finder-name">{rootName}</span>
                </div>
            )}

            {/* 子文件夹列表 */}
            {folderNodes.map((node) => (
                <FileTreeItem
                    key={node.path}
                    node={node}
                    activeFilePath={activeFilePath}
                    onFileSelect={onFileSelect}
                    onContextMenu={openContextMenu}
                    getColor={getColor}
                    level={rootName ? 1 : 0}
                    editingPath={editingPath}
                    onEditComplete={onEditComplete}
                    onStartEdit={onStartEdit}
                />
            ))}

            {/* 右键菜单 - 红黄绿圆圈 */}
            {contextMenu.show && contextMenu.node && (
                <div
                    className="context-menu"
                    style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {/* 新建文件夹 - 在当前文件夹内创建 */}
                    {onCreateFolder && (
                        <button onClick={() => {
                            onCreateFolder(contextMenu.node?.path)
                            closeMenu()
                        }}>新建文件夹</button>
                    )}
                    <button onClick={() => handleAction('rename')}>重命名</button>

                    {/* 红黄绿颜色圆圈 */}
                    <div className="color-circles">
                        {COLORS.filter(c => c.key !== 'none').map(c => {
                            const isActive = getCurrentColor() === c.key
                            return (
                                <button
                                    key={c.key}
                                    className={`color-circle ${isActive ? 'active' : ''}`}
                                    style={{ background: c.hex }}
                                    onClick={() => handleColorClick(c.key)}
                                    title={c.name}
                                >
                                    <span className="color-circle-icon">
                                        {isActive ? <Minus size={10} strokeWidth={2.5} /> : <Plus size={10} strokeWidth={2.5} />}
                                    </span>
                                </button>
                            )
                        })}
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
    editingPath?: string | null  // 正在编辑的文件夹路径
    onEditComplete?: (path: string, newName: string) => void  // 编辑完成回调
    onStartEdit?: (path: string) => void  // 开始编辑回调
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node,
    activeFilePath,
    onFileSelect,
    onContextMenu,
    getColor,
    level,
    editingPath,
    onEditComplete,
    onStartEdit
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 1)
    const [editValue, setEditValue] = useState(node.name)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const isEditing = editingPath === node.path

    // 编辑状态时自动聚焦并全选
    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleEditBlur = () => {
        if (onEditComplete) {
            const newName = editValue.trim() || '未命名文件夹'
            onEditComplete(node.path, newName)
        }
    }

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleEditBlur()
        } else if (e.key === 'Escape') {
            setEditValue(node.name)
            if (onEditComplete) {
                onEditComplete(node.path, node.name)
            }
        }
    }

    const isActive = activeFilePath === node.path
    // 只有包含子文件夹时才显示箭头（不考虑文件）
    const hasSubFolders = node.isDirectory && node.children && node.children.some(c => c.isDirectory)
    const color = getColor ? getColor(node.path) : 'none'
    const colorHex = COLORS.find(c => c.key === color)?.hex || 'transparent'

    const getFileCount = (): number => {
        if (!node.isDirectory || !node.children) return 0
        return node.children.filter(c => !c.isDirectory).length
    }

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        // 只选择，不展开（展开由箭头控制）
        onFileSelect(node)
    }

    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (node.isDirectory) {
            setIsExpanded(!isExpanded)
        }
    }

    // 只有文件夹图标
    const getIcon = () => {
        // 只有当文件夹有子文件夹且展开时才显示打开图标
        return (isExpanded && hasSubFolders) ? (
            <FolderOpen size={16} strokeWidth={1.5} />
        ) : (
            <Folder size={16} strokeWidth={1.5} />
        )
    }

    const fileCount = getFileCount()

    return (
        <div className="finder-tree-node">
            <div
                className={`finder-tree-item ${isActive ? 'active' : ''}`}
                onClick={handleClick}
                onDoubleClick={(e) => {
                    e.stopPropagation()
                    if (node.isDirectory) {
                        setIsExpanded(!isExpanded)
                    }
                }}
                onContextMenu={(e) => onContextMenu(e, node)}
                style={{ paddingLeft: `${12 + level * 16}px` }}
            >
                <span
                    className={`finder-chevron ${!hasSubFolders ? 'invisible' : ''}`}
                    onClick={handleChevronClick}
                >
                    {isExpanded ? (
                        <ChevronDown size={12} strokeWidth={2} />
                    ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                    )}
                </span>

                <span className="finder-icon">{getIcon()}</span>

                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="finder-name-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditBlur}
                        onKeyDown={handleEditKeyDown}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="finder-name"
                        onClick={(e) => {
                            e.stopPropagation()
                            // 如果已选中，单击名称进入编辑模式
                            if (isActive && onStartEdit) {
                                onStartEdit(node.path)
                            } else {
                                // 未选中时，先选中
                                onFileSelect(node)
                            }
                        }}
                    >
                        {node.name}
                    </span>
                )}

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

            {/* 只渲染子文件夹 */}
            {node.isDirectory && isExpanded && node.children && (
                <div className="finder-tree-children">
                    {node.children.filter(c => c.isDirectory).map((child) => (
                        <FileTreeItem
                            key={child.path}
                            node={child}
                            activeFilePath={activeFilePath}
                            onFileSelect={onFileSelect}
                            onContextMenu={onContextMenu}
                            getColor={getColor}
                            level={level + 1}
                            editingPath={editingPath}
                            onEditComplete={onEditComplete}
                            onStartEdit={onStartEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileTree
