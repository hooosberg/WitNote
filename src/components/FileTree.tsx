/**
 * Finder 风格文件树
 * 只显示文件夹 + 红黄绿颜色标记
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
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
    onStartEdit?: (path: string) => void
    onMove?: (sourcePath: string, targetDir: string) => void  // 拖拽移动回调
    // 排序相关
    orderedPaths?: string[]  // 已排序的路径数组
    onReorder?: (newOrder: string[]) => void  // 排序变化回调
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
    onStartEdit,
    onMove,
    orderedPaths,
    onReorder
}) => {
    const { t } = useTranslation()
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({
        show: false,
        x: 0,
        y: 0,
        node: null
    })

    // 空白区域右键菜单状态
    const [blankMenu, setBlankMenu] = useState<{ show: boolean; x: number; y: number }>({
        show: false,
        x: 0,
        y: 0
    })

    // 只显示文件夹，并根据 orderedPaths 排序
    const folderNodes = useMemo(() => {
        const folders = nodes.filter(n => n.isDirectory)
        if (!orderedPaths || orderedPaths.length === 0) {
            return folders
        }
        // 根据保存的顺序排序
        return [...folders].sort((a, b) => {
            const indexA = orderedPaths.indexOf(a.path)
            const indexB = orderedPaths.indexOf(b.path)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
    }, [nodes, orderedPaths])

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.context-menu')) {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
                setBlankMenu(prev => ({ ...prev, show: false }))
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setContextMenu(prev => ({ ...prev, show: false, node: null }))
                setBlankMenu(prev => ({ ...prev, show: false }))
            }
        }

        if (contextMenu.show || blankMenu.show) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [contextMenu.show, blankMenu.show])

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
        <div
            className="finder-tree"
            onClick={(e) => {
                // 点击空白区域回到根目录
                if (e.target === e.currentTarget && onRootSelect) {
                    onRootSelect()
                }
            }}
            onDragOver={(e) => {
                // 允许空白区域接收拖拽
                e.preventDefault()
                if (e.target === e.currentTarget) {
                    e.currentTarget.classList.add('drag-over-blank')
                }
            }}
            onDragLeave={(e) => {
                if (e.target === e.currentTarget) {
                    e.currentTarget.classList.remove('drag-over-blank')
                }
            }}
            onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('drag-over-blank')
                try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'))
                    if (data.path && onMove) {
                        // 移动到根目录
                        onMove(data.path, '')
                    }
                } catch {
                    console.error('拖拽数据解析失败')
                }
            }}
        >
            {/* 根目录项 - 支持接收拖拽（移动到根目录） */}
            {rootName && (
                <div
                    className={`finder-tree-item root-item ${isRootSelected ? 'active' : ''}`}
                    onClick={() => onRootSelect?.()}
                    onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('drag-over-inside')
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drag-over-inside')
                    }}
                    onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('drag-over-inside')
                        try {
                            const data = JSON.parse(e.dataTransfer.getData('application/json'))
                            if (data.path && onMove) {
                                // 移动到根目录（空字符串表示根目录）
                                onMove(data.path, '')
                            }
                        } catch {
                            console.error('拖拽数据解析失败')
                        }
                    }}
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
                    onMove={onMove}
                    siblings={folderNodes}
                    onReorder={onReorder}
                />
            ))}

            {/* 右键菜单 - 红黄绿圆圈 (使用 Portal 渲染到 body) */}
            {contextMenu.show && contextMenu.node && ReactDOM.createPortal(
                <div
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {/* 新建文件夹 - 在当前文件夹内创建 */}
                    {onCreateFolder && (
                        <button onClick={() => {
                            onCreateFolder(contextMenu.node?.path)
                            closeMenu()
                        }}>{t('contextMenu.newFolder')}</button>
                    )}
                    <button onClick={() => handleAction('rename')}>{t('contextMenu.rename')}</button>

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
                    <button onClick={() => handleAction('delete')} className="danger">{t('contextMenu.delete')}</button>
                </div>,
                document.body
            )}

            {/* 空白填充区域 - 点击回到根目录 */}
            <div
                className="finder-tree-blank"
                onClick={() => onRootSelect?.()}
                onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // 显示空白区域右键菜单
                    setBlankMenu({ show: true, x: e.clientX, y: e.clientY })
                }}
                onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('drag-over-blank')
                }}
                onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over-blank')
                }}
                onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('drag-over-blank')
                    try {
                        const data = JSON.parse(e.dataTransfer.getData('application/json'))
                        if (data.path && onMove) {
                            onMove(data.path, '')
                        }
                    } catch {
                        console.error('拖拽数据解析失败')
                    }
                }}
            />

            {/* 空白区域右键菜单 (使用 Portal 渲染到 body) */}
            {blankMenu.show && ReactDOM.createPortal(
                <div
                    className="context-menu"
                    style={{ left: blankMenu.x, top: blankMenu.y }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    {onCreateFolder && (
                        <button onClick={() => {
                            onCreateFolder(undefined)  // undefined 表示在根目录创建
                            setBlankMenu({ show: false, x: 0, y: 0 })
                        }}>{t('contextMenu.newFolder')}</button>
                    )}
                </div>,
                document.body
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
    editingPath?: string | null
    onEditComplete?: (path: string, newName: string) => void
    onStartEdit?: (path: string) => void
    onMove?: (sourcePath: string, targetPath: string) => void  // 拖拽移动回调
    // 排序相关
    siblings?: FileNode[]  // 同级节点列表
    onReorder?: (newOrder: string[]) => void  // 排序变化回调
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
    onStartEdit,
    onMove,
    siblings,
    onReorder
}) => {
    const [isExpanded, setIsExpanded] = useState(level < 1)
    const [editValue, setEditValue] = useState(node.name)
    const [dragOver, setDragOver] = useState<'top' | 'bottom' | 'inside' | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const dragTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

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
        // 拖拽过程中不触发选中（防止拖拽结束时意外切换视图）
        if (isDragging) return
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

    // ========== 拖拽处理 ==========
    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true)
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'folder',
            path: node.path,
            name: node.name
        }))
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragEnd = () => {
        setIsDragging(false)
        setDragOver(null)
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // 计算放置位置（上方/内部/下方）
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        const height = rect.height

        if (y < height * 0.25) {
            setDragOver('top')
        } else if (y > height * 0.75) {
            setDragOver('bottom')
        } else {
            setDragOver('inside')
            // 悬停 500ms 后展开文件夹
            if (!dragTimeoutRef.current) {
                dragTimeoutRef.current = setTimeout(() => {
                    setIsExpanded(true)
                }, 500)
            }
        }
    }

    const handleDragLeave = () => {
        setDragOver(null)
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current)
            dragTimeoutRef.current = null
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const currentDragOver = dragOver  // 保存当前值因为 setDragOver 后会清空
        setDragOver(null)

        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current)
            dragTimeoutRef.current = null
        }

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (!data.path || data.path === node.path) return

            // 检查是否是同级排序（拖拽项和目标项在同一层级）
            const draggedParent = data.path.split('/').slice(0, -1).join('/')
            const targetParent = node.path.split('/').slice(0, -1).join('/')
            const isSameLevel = draggedParent === targetParent

            if (currentDragOver === 'inside' && onMove) {
                // 移动到此文件夹内
                onMove(data.path, node.path)
            } else if ((currentDragOver === 'top' || currentDragOver === 'bottom') && isSameLevel && siblings && onReorder) {
                // 同级排序：重新排列顺序
                const currentPaths = siblings.map(s => s.path)
                const draggedIndex = currentPaths.indexOf(data.path)

                if (draggedIndex !== -1) {
                    // 从原位置移除
                    currentPaths.splice(draggedIndex, 1)
                    // 计算新位置
                    const newTargetIndex = currentPaths.indexOf(node.path)
                    const insertIndex = currentDragOver === 'top' ? newTargetIndex : newTargetIndex + 1
                    // 插入到新位置
                    currentPaths.splice(insertIndex, 0, data.path)
                    // 调用排序回调
                    onReorder(currentPaths)
                }
            } else if ((currentDragOver === 'top' || currentDragOver === 'bottom') && onMove) {
                // 跨层级移动：移动到当前节点的父目录
                onMove(data.path, targetParent)
            }
        } catch {
            console.error('拖拽数据解析失败')
        }
    }

    // 拖拽样式类
    const dragClass = isDragging ? 'dragging' : ''
    const dropClass = dragOver ? `drag-over-${dragOver}` : ''

    return (
        <div className="finder-tree-node">
            <div
                className={`finder-tree-item ${isActive ? 'active' : ''} ${dragClass} ${dropClass}`}
                draggable={!isEditing}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                            onMove={onMove}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default FileTree
