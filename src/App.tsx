/**
 * 主应用组件
 * Phase 8: 可调整三栏布局 + 增强画廊
 */

import React, { useEffect, useState, useMemo } from 'react'
import {
    Panel,
    PanelGroup
} from 'react-resizable-panels'
import {
    FolderPlus,
    Plus,
    Minus,
    Columns,
    ArrowUp,
    ArrowDown
} from 'lucide-react'
import Onboarding from './components/Onboarding'
import FileTree, { ColorKey } from './components/FileTree'
import Editor from './components/Editor'
import ChatPanel from './components/ChatPanel'
import InputDialog from './components/InputDialog'
import { ToastProvider, useToast } from './components/Toast'
import { useFileSystem, FileNode } from './hooks/useFileSystem'
import { useLLM } from './hooks/useLLM'
import './styles/index.css'

// 颜色配置 - 红黄绿蓝
const COLORS: { key: ColorKey; hex: string; name: string }[] = [
    { key: 'none', hex: 'transparent', name: '无' },
    { key: 'red', hex: '#ff453a', name: '红' },
    { key: 'yellow', hex: '#ffcc00', name: '黄' },
    { key: 'green', hex: '#30d158', name: '绿' },
    { key: 'blue', hex: '#007aff', name: '蓝' },
]

// 排序选项
type SortOption = 'name-asc' | 'name-desc' | 'time-asc' | 'time-desc'

// 生成文件名
const generateFileName = (): string => {
    const now = new Date()
    const timestamp = `${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}`
    return `Untitled_${timestamp}.txt`
}

const AppContent: React.FC = () => {
    const fileSystem = useFileSystem()
    const llm = useLLM()
    const { showToast } = useToast()

    // 专注模式：true = 两侧关闭，false = 两侧打开
    const [focusMode, setFocusMode] = useState(false)

    // 切换专注模式
    const toggleFocusMode = () => {
        setFocusMode(prev => !prev)
    }

    // 派生状态
    const leftCollapsed = focusMode
    const rightCollapsed = focusMode

    // 对话框状态
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [renameTarget, setRenameTarget] = useState<FileNode | null>(null)

    // 颜色系统
    const [colors, setColors] = useState<Record<string, ColorKey>>({})

    // 排序（默认最新优先 time-desc，点击切换为最早优先 time-asc）
    const [sortBy, setSortBy] = useState<SortOption>('time-desc')
    const [filterColor, setFilterColor] = useState<ColorKey | 'all'>('all')

    // 文件预览缓存
    const [previews, setPreviews] = useState<Record<string, string>>({})

    // 画廊右键菜单
    const [galleryMenu, setGalleryMenu] = useState<{
        show: boolean
        x: number
        y: number
        node: FileNode | null
    }>({ show: false, x: 0, y: 0, node: null })

    const {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        fileContent,
        selectVault,
        openFile,
        selectFolder,
        setFileContent,
        toggleFileFormat,
        createNewFile,
        createNewFolder,
        renameItem,
        deleteFile,
    } = fileSystem

    // 引擎切换
    useEffect(() => {
        llm.onEngineChange((event) => {
            if (event.reason === 'heartbeat') {
                showToast(
                    event.to === 'ollama' ? 'success' : 'info',
                    event.to === 'ollama' ? '🟢 Ollama 已连接' : '🔵 使用内置模型'
                )
            }
        })
    }, [llm, showToast])

    // 上下文同步
    useEffect(() => {
        if (activeFile) {
            llm.loadChatHistory(activeFile.path)
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        } else if (activeFolder) {
            const files = activeFolder.children?.filter(c => !c.isDirectory).map(c => c.name) || []
            llm.setActiveFolderContext(activeFolder.name, files)
        } else {
            llm.setActiveFileContext(null, null, null)
        }
    }, [activeFile?.path, activeFolder?.path])

    useEffect(() => {
        if (activeFile) {
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        }
    }, [fileContent])

    // 加载文件预览
    useEffect(() => {
        const loadPreviews = async () => {
            const files = getCurrentFolderFiles()
            for (const file of files) {
                if (!previews[file.path] && window.fs) {
                    try {
                        const content = await window.fs.readFile(file.path.replace(vaultPath + '/', ''))
                        setPreviews(prev => ({
                            ...prev,
                            [file.path]: content.slice(0, 100)
                        }))
                    } catch {
                        // 忽略错误
                    }
                }
            }
        }
        if (vaultPath) loadPreviews()
    }, [activeFolder, fileTree, vaultPath])

    // 关闭菜单（点击外部区域时）
    useEffect(() => {
        const close = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            // 关闭画廊右键菜单
            if (!target.closest('.gallery-menu')) {
                setGalleryMenu(prev => ({ ...prev, show: false }))
            }
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    // 颜色系统
    const getColor = (path: string): ColorKey => colors[path] || 'none'
    const setColor = (path: string, color: ColorKey) => {
        setColors(prev => {
            const next = { ...prev }
            if (color === 'none') delete next[path]
            else next[path] = color
            return next
        })
    }

    // 获取当前文件夹的文件
    const getCurrentFolderFiles = (): FileNode[] => {
        if (activeFolder) {
            return activeFolder.children?.filter(c => !c.isDirectory) || []
        }
        return fileTree.filter(n => !n.isDirectory)
    }

    // 排序和筛选后的文件
    const sortedFilteredFiles = useMemo(() => {
        let files = getCurrentFolderFiles()

        // 颜色筛选
        if (filterColor !== 'all') {
            files = files.filter(f => getColor(f.path) === filterColor)
        }

        // 排序
        files.sort((a, b) => {
            switch (sortBy) {
                case 'name-asc':
                    return a.name.localeCompare(b.name)
                case 'name-desc':
                    return b.name.localeCompare(a.name)
                case 'time-asc':
                    return (a.modifiedAt || 0) - (b.modifiedAt || 0)
                case 'time-desc':
                    return (b.modifiedAt || 0) - (a.modifiedAt || 0)
                default:
                    return 0
            }
        })

        return files
    }, [fileTree, activeFolder, filterColor, sortBy, colors])

    // 加载中
    if (!isInitialized) {
        return (
            <div className="app-loading">
                <div className="loading-spinner">🧘</div>
                <p>正在初始化...</p>
            </div>
        )
    }

    if (!vaultPath) {
        return <Onboarding onSelectVault={selectVault} />
    }

    // Handlers
    const handleCreateFolder = async (name: string) => {
        await createNewFolder(name)
        setShowNewFolderDialog(false)
    }

    const handleQuickCreate = async () => {
        const fileName = generateFileName()
        await createNewFile(fileName)
    }

    const handleRename = async (newName: string) => {
        if (renameTarget) {
            await renameItem(renameTarget.path, newName)
            setShowRenameDialog(false)
            setRenameTarget(null)
        }
    }

    const handleDelete = async (node: FileNode) => {
        if (confirm(`删除 "${node.name}"?`)) {
            await deleteFile(node.path)
        }
    }

    const handleTitleChange = async (newFileName: string) => {
        if (activeFile && newFileName !== activeFile.name) {
            await renameItem(activeFile.path, newFileName)
        }
    }

    // 画廊右键菜单
    const handleCardContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault()
        setGalleryMenu({ show: true, x: e.clientX, y: e.clientY, node })
    }

    const handleGalleryAction = (action: 'rename' | 'delete') => {
        const node = galleryMenu.node
        setGalleryMenu({ show: false, x: 0, y: 0, node: null })
        if (node) {
            if (action === 'rename') {
                setRenameTarget(node)
                setShowRenameDialog(true)
            }
            else if (action === 'delete') handleDelete(node)
        }
    }

    const handleGalleryColor = (color: ColorKey) => {
        if (galleryMenu.node) {
            const currentColor = getColor(galleryMenu.node.path)
            // 如果已经是这个颜色，则取消标记
            if (currentColor === color) {
                setColor(galleryMenu.node.path, 'none')
            } else {
                setColor(galleryMenu.node.path, color)
            }
        }
        setGalleryMenu({ show: false, x: 0, y: 0, node: null })
    }

    // 获取画廊节点当前颜色
    const getGalleryCurrentColor = () => {
        if (!galleryMenu.node) return 'none'
        return getColor(galleryMenu.node.path)
    }

    // 颜色边框样式
    const getCardStyle = (path: string) => {
        const color = getColor(path)
        const c = COLORS.find(x => x.key === color)
        if (!c || color === 'none') return { border: 'rgba(0,0,0,0.08)', bg: 'transparent' }
        return { border: c.hex, bg: `${c.hex}10` }
    }

    return (
        <div className="app-root">
            <div className="titlebar-drag-region" />

            {/* 专注模式切换按钮 - 右上角 */}
            <button
                className="layout-toggle-btn"
                onClick={toggleFocusMode}
                title={focusMode ? '恢复边栏' : '专注模式'}
            >
                <Columns size={16} strokeWidth={1.5} />
            </button>

            {/* 对话框 */}
            <InputDialog
                isOpen={showNewFolderDialog}
                title="新建文件夹"
                placeholder="名称"
                onConfirm={handleCreateFolder}
                onCancel={() => setShowNewFolderDialog(false)}
            />
            <InputDialog
                isOpen={showRenameDialog}
                title="重命名"
                placeholder="新名称"
                defaultValue={renameTarget?.name || ''}
                onConfirm={handleRename}
                onCancel={() => { setShowRenameDialog(false); setRenameTarget(null) }}
            />

            {/* 可调整三栏布局 */}
            <PanelGroup direction="horizontal" className="panel-group">
                {/* 左侧边栏 */}
                {!leftCollapsed && (
                    <>
                        <Panel defaultSize={25} minSize={25} maxSize={25} className="panel-sidebar">
                            <div className="sidebar-inner">
                                <div className="sidebar-header">
                                    <span className="sidebar-spacer" />
                                    <button
                                        className="sidebar-btn"
                                        onClick={() => setShowNewFolderDialog(true)}
                                    >
                                        <FolderPlus size={16} strokeWidth={1.5} />
                                    </button>
                                </div>

                                {/* 点击空白处返回根目录 */}
                                <div
                                    className="sidebar-content"
                                    onClick={(e) => {
                                        // 只有点击空白处时才触发
                                        if (e.target === e.currentTarget) {
                                            selectFolder(null)
                                        }
                                    }}
                                >
                                    {fileTree.length === 0 ? (
                                        <div className="sidebar-empty">空</div>
                                    ) : (
                                        <FileTree
                                            nodes={fileTree}
                                            activeFilePath={activeFolder?.path || null}
                                            onFileSelect={openFile}
                                            onRename={(node) => {
                                                setRenameTarget(node)
                                                setShowRenameDialog(true)
                                            }}
                                            onDelete={handleDelete}
                                            getColor={getColor}
                                            onColorChange={setColor}
                                            rootName={vaultPath?.split('/').pop() || '根目录'}
                                            isRootSelected={!activeFolder && !activeFile}
                                            onRootSelect={() => selectFolder(null)}
                                        />
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </>
                )}

                {/* 中间内容区 */}
                <Panel defaultSize={leftCollapsed && rightCollapsed ? 100 : 50} minSize={30} className="panel-main">
                    <div className="main-inner">
                        {activeFile ? (
                            <Editor
                                content={fileContent}
                                onChange={setFileContent}
                                fileName={activeFile.name}
                                fileExtension={activeFile.extension || 'txt'}
                                onTitleChange={handleTitleChange}
                                onFormatToggle={toggleFileFormat}
                                focusMode={focusMode}
                            />
                        ) : (
                            /* 画廊视图 */
                            <div className="gallery-view">
                                {/* 画廊头部 - 只有操作按钮 */}
                                <div className={`gallery-header ${focusMode ? 'focus-mode' : ''}`}>
                                    <div className="gallery-actions">
                                        {/* 排序切换按钮 */}
                                        <button
                                            className="action-btn"
                                            onClick={() => setSortBy(prev => prev === 'time-desc' ? 'time-asc' : 'time-desc')}
                                            title={sortBy === 'time-desc' ? '最新优先' : '最早优先'}
                                        >
                                            {sortBy === 'time-desc' ? (
                                                <ArrowUp size={16} strokeWidth={1.5} />
                                            ) : (
                                                <ArrowDown size={16} strokeWidth={1.5} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* 文件网格 - 第一个永远是新建卡片 */}
                                <div className="gallery-grid-square">
                                    {/* 新建文章卡片 */}
                                    <div
                                        className="file-card-square create-card"
                                        onClick={handleQuickCreate}
                                    >
                                        <Plus size={32} strokeWidth={1.2} className="create-card-icon" />
                                        <div className="create-card-text">新建文章</div>
                                    </div>

                                    {/* 文件卡片列表 */}
                                    {sortedFilteredFiles.map(file => {
                                        const style = getCardStyle(file.path)
                                        const preview = previews[file.path] || ''
                                        return (
                                            <div
                                                key={file.path}
                                                className="file-card-square"
                                                onClick={() => openFile(file)}
                                                onContextMenu={(e) => handleCardContextMenu(e, file)}
                                                style={{
                                                    borderColor: style.border,
                                                    background: style.bg
                                                }}
                                            >
                                                <div className="card-title">
                                                    {file.name.replace(/\.[^/.]+$/, '')}
                                                </div>
                                                <div className="card-summary">
                                                    {preview || '...'}
                                                </div>
                                                <div className="card-date">
                                                    {file.modifiedAt ? (() => {
                                                        const d = new Date(file.modifiedAt)
                                                        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
                                                    })() : '--'}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </Panel>

                {/* 右侧 AI 面板 */}
                {!rightCollapsed && (
                    <>
                        <Panel defaultSize={25} minSize={25} maxSize={25} className="panel-chat">
                            <ChatPanel llm={llm} />
                        </Panel>
                    </>
                )}
            </PanelGroup>

            {/* 画廊右键菜单 */}
            {
                galleryMenu.show && galleryMenu.node && (
                    <div
                        className="gallery-menu context-menu"
                        style={{ position: 'fixed', left: galleryMenu.x, top: galleryMenu.y }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <button onClick={() => handleGalleryAction('rename')}>重命名</button>

                        {/* 红黄绿颜色圆圈 */}
                        <div className="color-circles">
                            {COLORS.filter(c => c.key !== 'none').map(c => {
                                const isActive = getGalleryCurrentColor() === c.key
                                return (
                                    <button
                                        key={c.key}
                                        className={`color-circle ${isActive ? 'active' : ''}`}
                                        style={{ background: c.hex }}
                                        onClick={() => handleGalleryColor(c.key)}
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
                        <button className="danger" onClick={() => handleGalleryAction('delete')}>删除</button>
                    </div>
                )
            }
        </div >
    )
}

export const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
)

export default App
