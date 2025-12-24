/**
 * 主应用组件
 * Phase 8: 可调整三栏布局 + 增强画廊
 */

import React, { useEffect, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
    Panel,
    PanelGroup
} from 'react-resizable-panels'
import {
    Home,
    Plus,
    Minus,
    Link,
    Unlink,
    Glasses,
    Coffee,
    Settings
} from 'lucide-react'
import FileTree, { ColorKey } from './components/FileTree'
import Editor from './components/Editor'
import ChatPanel from './components/ChatPanel'
import InputDialog from './components/InputDialog'
import { ToastProvider, useToast } from './components/Toast'
import SettingsPanel from './components/Settings'
import ConfirmDialog from './components/ConfirmDialog'
import { useFileSystem, FileNode } from './hooks/useFileSystem'
import { useLLM } from './hooks/useLLM'
import { useFolderOrder } from './hooks/useFolderOrder'
import { useSettings } from './hooks/useSettings'
import { useEngineStore } from './store/engineStore'
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
const generateFileName = (format: 'txt' | 'md' = 'md'): string => {
    const now = new Date()
    const timestamp = `${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}`
    return `Untitled_${timestamp}.${format}`
}

const AppContent: React.FC = () => {
    const { t, i18n } = useTranslation()
    const fileSystem = useFileSystem()
    const engineStore = useEngineStore()
    const llm = useLLM(engineStore)
    const { } = useToast()
    const folderOrder = useFolderOrder()
    const { settings } = useSettings()

    // 平台检测：为 Windows 添加特殊 class 以调整布局
    useEffect(() => {
        if (window.platform?.isWindows) {
            document.body.classList.add('platform-windows')
        } else if (window.platform?.isMac) {
            document.body.classList.add('platform-mac')
        }
        return () => {
            document.body.classList.remove('platform-windows', 'platform-mac')
        }
    }, [])

    // 专注模式和响应式布局状态
    const [manualFocusMode, setManualFocusMode] = useState(false) // 用户手动开启的专注模式
    const [autoHideRight, setAutoHideRight] = useState(false)     // 响应式隐藏右侧
    const [autoHideLeft, setAutoHideLeft] = useState(false)       // 响应式隐藏左侧

    // 响应式布局：渐进式隐藏面板
    // > 1000px: 三栏（完整布局）
    // 800-1000px: 两栏（先隐藏右侧AI面板）
    // 800-1000px: 两栏（先隐藏左侧文件栏）
    // < 800px: 单栏（再隐藏右侧AI栏）
    useEffect(() => {
        // 如果用户手动开启了专注模式，不受窗口尺寸影响
        if (manualFocusMode) return

        const THREE_COL_THRESHOLD = 1000  // 三栏阈值
        const TWO_COL_THRESHOLD = 800     // 两栏阈值

        const handleResize = () => {
            const width = window.innerWidth
            console.log('窗口宽度:', width)

            if (width >= THREE_COL_THRESHOLD) {
                // 宽屏：三栏布局，恢复所有面板
                setAutoHideLeft(false)
                setAutoHideRight(false)
            } else if (width >= TWO_COL_THRESHOLD) {
                // 中等：两栏布局，先隐藏左侧文件栏
                setAutoHideLeft(true)
                setAutoHideRight(false)
            } else {
                // 窄屏：单栏，再隐藏右侧AI栏
                setAutoHideLeft(true)
                setAutoHideRight(true)
            }
        }

        // 初始检测
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [manualFocusMode])

    // 派生的专注模式状态（用户手动隐藏两侧 或 响应式自动隐藏两侧）
    const focusMode = manualFocusMode || (autoHideLeft && autoHideRight)

    // 切换专注模式（手动控制）
    const toggleFocusMode = () => {
        if (autoHideLeft && autoHideRight && !manualFocusMode) {
            // 在自动专注模式下（窗口<800px），调整窗口宽度到1000px
            const appWindow = (window as unknown as { appWindow?: { setWidth: (w: number) => Promise<boolean> } }).appWindow
            if (appWindow) {
                appWindow.setWidth(1000)
            }
        } else {
            // 正常切换手动专注模式
            setManualFocusMode(prev => !prev)
        }
    }

    // 专注模式变化时管理语言模型
    useEffect(() => {
        if (focusMode) {
            // 进入专注模式：卸载模型释放内存
            llm.unloadModel()
        } else {
            // 退出专注模式：重新检测并加载模型
            llm.retryDetection()
        }
    }, [focusMode])

    // 派生状态：左右面板独立控制
    const leftCollapsed = manualFocusMode || autoHideLeft   // 手动专注模式或响应式隐藏左侧
    const rightCollapsed = manualFocusMode || autoHideRight // 手动专注模式或响应式隐藏右侧

    // 对话框状态
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [newFolderTargetDir, setNewFolderTargetDir] = useState('')  // 新建文件夹的目标目录
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [renameTarget, setRenameTarget] = useState<FileNode | null>(null)
    const [editingFolderPath, setEditingFolderPath] = useState<string | null>(null)  // 正在内联编辑的文件夹

    // 颜色系统（从 localStorage 加载持久化）
    const [colors, setColors] = useState<Record<string, ColorKey>>(() => {
        try {
            const saved = localStorage.getItem('zen-note-colors')
            return saved ? JSON.parse(saved) : {}
        } catch {
            return {}
        }
    })

    // 排序（默认最新优先 time-desc，点击切换为最早优先 time-asc）
    const [_sortBy, _setSortBy] = useState<SortOption>('time-desc')
    const [filterColor, _setFilterColor] = useState<ColorKey | 'all'>('all')

    // 设置面板状态
    const [showSettings, setShowSettings] = useState(false)
    const [settingsDefaultTab, setSettingsDefaultTab] = useState<'appearance' | 'ai' | 'persona' | 'shortcuts' | 'about'>('appearance')

    // 打开设置面板的函数
    const openSettingsPanel = (tab: 'appearance' | 'ai' | 'persona' | 'shortcuts' | 'about' = 'appearance') => {
        setSettingsDefaultTab(tab)
        setShowSettings(true)
    }

    // 卡片拖拽排序状态
    const [cardDragSort, setCardDragSort] = useState<{
        draggingPath: string | null  // 正在拖拽的卡片路径
        hoverIndex: number | null     // 悬停的目标索引
    }>({ draggingPath: null, hoverIndex: null })

    // 文件预览缓存
    const [previews, setPreviews] = useState<Record<string, string>>({})

    // 画廊右键菜单
    const [galleryMenu, setGalleryMenu] = useState<{
        show: boolean
        x: number
        y: number
        node: FileNode | null
    }>({ show: false, x: 0, y: 0, node: null })

    // 侧边栏右键菜单(用于空白区域和根目录)
    const [sidebarMenu, setSidebarMenu] = useState<{
        show: boolean
        x: number
        y: number
    }>({ show: false, x: 0, y: 0 })

    // 自定义确认对话框状态
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        details?: string[];
        onConfirm: () => void;
    } | null>(null)

    const {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        fileContent,
        isNewlyCreatedFile,
        selectVault,
        openFile,
        selectFolder,
        getAllFiles,
        setFileContent,
        convertFileFormat,
        createNewFile,
        createNewFolder,
        renameItem,
        deleteFile,
        moveItem,
    } = fileSystem

    // 加载文件摘要函数
    const loadFilePreviews = async (files: FileNode[]): Promise<Map<string, string>> => {
        const previewMap = new Map<string, string>();
        const PREVIEW_LENGTH = 80; // 每个文件摘要长度

        // 限制并发数量
        const filesToLoad = files.slice(0, 15); // 最多加载 15 个文件

        await Promise.all(filesToLoad.map(async (file) => {
            try {
                const content = await window.fs.readFile(file.path);
                if (content) {
                    // 去掉标题行，取正文前 N 字
                    const lines = content.split('\n').filter((l: string) => l.trim() && !l.startsWith('#'));
                    const preview = lines.join(' ').slice(0, PREVIEW_LENGTH);
                    if (preview) {
                        previewMap.set(file.name, preview + (preview.length >= PREVIEW_LENGTH ? '...' : ''));
                    }
                }
            } catch {
                // 忽略读取错误
            }
        }));

        return previewMap;
    }

    // 上下文同步（仅在切换文件/文件夹时触发）
    useEffect(() => {
        const syncContext = async () => {
            if (activeFile) {
                // 检查是否是新文件（使用标志或内容为空判断）
                const isNewFile = isNewlyCreatedFile || (!fileContent || fileContent.trim() === '')

                if (isNewFile) {
                    // 新文件：清空聊天记录，不加载历史
                    llm.clearMessages()
                    console.log('📝 新文件，清空聊天记录')

                    // 如果是 Markdown 文件，发送语法提示
                    if (activeFile.extension === 'md' || activeFile.extension === '.md') {
                        llm.injectMessage("assistant", t("editor.mdCheatSheet"));
                    }
                } else {
                    // 已有内容的文件：加载聊天记录
                    llm.loadChatHistory(activeFile.path).then((history) => {
                        // 如果是 Markdown 文件且聊天记录为空，发送语法提示
                        if (
                            (activeFile.extension === 'md' || activeFile.extension === '.md') &&
                            (!history || history.length === 0)
                        ) {
                            llm.injectMessage("assistant", t("editor.mdCheatSheet"));
                        }
                    })
                }
                llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
            } else if (activeFolder) {
                // 文件夹：使用虚拟路径 __folder__/文件夹名
                const chatPath = `__folder__/${activeFolder.name}`
                llm.loadChatHistory(chatPath)
                const files = activeFolder.children?.filter(c => !c.isDirectory) || []
                const fileNames = files.map(c => c.name)
                const previewMap = await loadFilePreviews(files as FileNode[])
                llm.setActiveFolderContext(activeFolder.name, fileNames, previewMap)
            } else if (vaultPath) {
                // 根目录：使用虚拟路径 __root__
                llm.loadChatHistory('__root__')
                const allFiles = getAllFiles()
                const fileNames = allFiles.map(f => f.name)
                const previewMap = await loadFilePreviews(allFiles)
                llm.setActiveFolderContext(null, fileNames, previewMap)
            } else {
                // 未连接：清空聊天
                llm.clearMessages()
                llm.setActiveFileContext(null, null, null)
            }
        }
        syncContext()
    }, [activeFile?.path, activeFolder?.path, vaultPath])  // 移除 fileContent 避免编辑时重复触发

    // 单独处理 fileContent 变化（编辑文件时）
    useEffect(() => {
        if (activeFile && fileContent !== null) {
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        }
    }, [fileContent])  // 只监听 fileContent

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

    // 快捷方式监听
    useEffect(() => {
        if (!window.shortcuts) return

        // 监听新建文章快捷方式
        const unsubCreateArticle = window.shortcuts.onCreateArticle(async () => {
            const fileName = generateFileName(settings.defaultFormat)
            await createNewFile(fileName)
        })

        // 监听新建文件夹快捷方式
        const unsubCreateFolder = window.shortcuts.onCreateFolder(() => {
            setNewFolderTargetDir(activeFolder?.path || '')
            setShowNewFolderDialog(true)
        })

        // 监听打开设置快捷方式
        const unsubOpenSettings = window.shortcuts.onOpenSettings(() => {
            setShowSettings(true)
        })

        // 监听专注模式切换快捷方式
        const unsubToggleFocusMode = window.shortcuts.onToggleFocusMode(() => {
            if (autoHideLeft && autoHideRight && !manualFocusMode) {
                // 在自动专注模式下（窗口<800px），调整窗口宽度到1000px
                const appWindow = (window as unknown as { appWindow?: { setWidth: (w: number) => Promise<boolean> } }).appWindow
                if (appWindow) {
                    appWindow.setWidth(1000)
                }
            } else {
                // 正常切换手动专注模式
                setManualFocusMode(prev => !prev)
            }
        })

        return () => {
            unsubCreateArticle()
            unsubCreateFolder()
            unsubOpenSettings()
            unsubToggleFocusMode()
        }
    }, [activeFolder, settings.defaultFormat, createNewFile, autoHideLeft, autoHideRight, manualFocusMode])

    // 关闭菜单（点击外部区域时）
    useEffect(() => {
        const close = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            // 关闭画廊右键菜单
            if (!target.closest('.gallery-menu')) {
                setGalleryMenu(prev => ({ ...prev, show: false }))
            }
            // 关闭侧边栏右键菜单
            if (!target.closest('.sidebar-menu')) {
                setSidebarMenu(prev => ({ ...prev, show: false }))
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
            // 保存到 localStorage
            try {
                localStorage.setItem('zen-note-colors', JSON.stringify(next))
            } catch (e) {
                console.error('保存颜色失败:', e)
            }
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

    // 根据 activeFolder 获取当前显示的文件列表
    const currentFiles = useMemo(() => {
        if (!activeFolder) {
            // 根目录：只显示根目录下直接的文件（不包括子文件夹内的）
            return fileTree.filter(n => !n.isDirectory)
        }
        // 文件夹：显示该文件夹内的文件
        return activeFolder.children?.filter(n => !n.isDirectory) || []
    }, [activeFolder, fileTree])

    // 排序和筛选后的文件
    const sortedFilteredFiles = useMemo(() => {
        let files = currentFiles

        // 颜色筛选
        if (filterColor !== 'all') {
            files = files.filter(f => getColor(f.path) === filterColor)
        }

        // 排序逻辑：
        // 1. 获取保存的顺序列表
        // 2. 新文件（不在列表中的）按时间倒序插入到列表开头
        // 3. 按列表顺序排序
        const orderKey = activeFolder?.path || '__root_files__'
        const customOrder = folderOrder.getOrder(orderKey)

        // 先按时间倒序排列所有文件
        const sortedByTime = [...files].sort((a, b) => {
            return (b.modifiedAt || 0) - (a.modifiedAt || 0)
        })

        if (customOrder.length === 0) {
            // 没有自定义顺序，直接按时间倒序
            return sortedByTime
        }

        // 有自定义顺序：将新文件插入到顺序列表开头
        const updatedOrder = [...customOrder]
        const newFiles: FileNode[] = []

        for (const file of sortedByTime) {
            if (!customOrder.includes(file.path)) {
                newFiles.push(file)
            }
        }

        // 新文件按时间倒序（已经是了），插入到列表开头
        for (const file of newFiles) {
            updatedOrder.unshift(file.path)
        }

        // 如果有新文件，更新保存的顺序
        if (newFiles.length > 0) {
            folderOrder.setOrder(orderKey, updatedOrder)
        }

        // 按更新后的顺序排序
        return sortedByTime.sort((a, b) => {
            const indexA = updatedOrder.indexOf(a.path)
            const indexB = updatedOrder.indexOf(b.path)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
    }, [currentFiles, filterColor, getColor, activeFolder?.path, folderOrder])

    // 拖拽时的虚拟排序预览
    const virtualOrderFiles = useMemo(() => {
        if (!cardDragSort.draggingPath || cardDragSort.hoverIndex === null) {
            return sortedFilteredFiles
        }

        const files = [...sortedFilteredFiles]
        const draggedIndex = files.findIndex(f => f.path === cardDragSort.draggingPath)
        if (draggedIndex === -1) return sortedFilteredFiles

        // 从原位置移除
        const [draggedFile] = files.splice(draggedIndex, 1)
        // 插入到新位置
        const insertIndex = draggedIndex < cardDragSort.hoverIndex
            ? cardDragSort.hoverIndex - 1
            : cardDragSort.hoverIndex
        files.splice(insertIndex, 0, draggedFile)

        return files
    }, [sortedFilteredFiles, cardDragSort.draggingPath, cardDragSort.hoverIndex])

    // 加载中
    if (!isInitialized) {
        return (
            <div className="app-loading">
                <div className="loading-spinner">🧘</div>
                <p>正在初始化...</p>
            </div>
        )
    }

    // 不再提前返回 Onboarding，让主界面始终显示
    // 未连接状态通过侧边栏底部按钮处理

    // Handlers
    const handleCreateFolder = async (name: string) => {
        await createNewFolder(name, newFolderTargetDir || undefined)
        setShowNewFolderDialog(false)
        setNewFolderTargetDir('')  // 重置目标目录
    }

    const handleQuickCreate = async () => {
        const fileName = generateFileName(settings.defaultFormat)
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
        if (!c || color === 'none') {
            // 使用 CSS 变量，跟随主题变化
            return {
                border: 'var(--border-color)',
                bg: 'var(--bg-card)',
                shadow: 'rgba(0, 0, 0, 0.12)'
            }
        }
        // 根据标注颜色设置投影颜色
        return {
            border: c.hex,
            bg: `${c.hex}10`,
            shadow: `${c.hex}40`
        }
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
                {focusMode ? (
                    <Glasses size={16} strokeWidth={1.5} />
                ) : (
                    <Coffee size={16} strokeWidth={1.5} />
                )}
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

            {/* 设置面板 */}
            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                llm={llm}
                defaultTab={settingsDefaultTab}
                engineStore={engineStore}
            />

            {/* 可调整三栏布局 */}
            <PanelGroup direction="horizontal" className="panel-group">
                {/* 左侧边栏 */}
                {!leftCollapsed && (
                    <>
                        <Panel defaultSize={25} minSize={25} maxSize={25} className="panel-sidebar">
                            <div className="sidebar-inner">
                                {/* 侧边栏头部 - 只保留占位符对齐 */}
                                <div className="sidebar-header">
                                    <span className="sidebar-spacer" />
                                </div>

                                {/* 侧边栏内容 - 支持拖拽到空白区域移到根目录 */}
                                <div
                                    className="sidebar-content"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) {
                                            selectFolder(null)
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        // 只在空白区域触发（非子元素）
                                        if (e.target === e.currentTarget) {
                                            e.preventDefault()
                                            setSidebarMenu({ show: true, x: e.clientX, y: e.clientY })
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        // 只在空白区域高亮（非子元素）
                                        if (e.target === e.currentTarget) {
                                            e.preventDefault()
                                            e.currentTarget.classList.add('drag-over-blank')
                                        }
                                    }}
                                    onDragLeave={(e) => {
                                        if (e.target === e.currentTarget) {
                                            e.currentTarget.classList.remove('drag-over-blank')
                                        }
                                    }}
                                    onDrop={async (e) => {
                                        // 只在空白区域处理拖拽
                                        if (e.target === e.currentTarget) {
                                            e.preventDefault()
                                            e.currentTarget.classList.remove('drag-over-blank')
                                            try {
                                                const data = JSON.parse(e.dataTransfer.getData('application/json'))
                                                if (data.path) {
                                                    // 移动到根目录
                                                    await moveItem(data.path, '')
                                                }
                                            } catch {
                                                console.error('拖拽数据解析失败')
                                            }
                                        }
                                    }}
                                >
                                    {vaultPath ? (
                                        <>
                                            {/* 根目录项 - 始终显示，支持拖拽放入 */}
                                            <div
                                                className={`finder-tree-item root-item ${!activeFolder ? 'active' : ''}`}
                                                onClick={() => selectFolder(null)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    setSidebarMenu({ show: true, x: e.clientX, y: e.clientY })
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.add('drag-over-inside')
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('drag-over-inside')
                                                }}
                                                onDrop={async (e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.remove('drag-over-inside')
                                                    try {
                                                        const data = JSON.parse(e.dataTransfer.getData('application/json'))
                                                        if (data.path) {
                                                            // 移动到根目录（空字符串表示根目录）
                                                            await moveItem(data.path, '')
                                                        }
                                                    } catch {
                                                        console.error('拖拽数据解析失败')
                                                    }
                                                }}
                                                style={{ paddingLeft: '12px' }}
                                            >
                                                <span className="finder-icon">
                                                    <Home size={16} strokeWidth={1.5} />
                                                </span>
                                                <span className="finder-name">{vaultPath.split('/').pop()}</span>
                                                <span className="finder-spacer" />
                                                {/* 显示总文件数量 */}
                                                <span className="finder-count">{getAllFiles().length}</span>
                                            </div>

                                            {/* 子文件夹 */}
                                            {fileTree.filter(n => n.isDirectory).length > 0 ? (
                                                <FileTree
                                                    nodes={fileTree}
                                                    activeFilePath={activeFolder?.path || null}
                                                    onFileSelect={openFile}
                                                    onRootSelect={() => selectFolder(null)}
                                                    onRename={(node) => {
                                                        setRenameTarget(node)
                                                        setShowRenameDialog(true)
                                                    }}
                                                    onDelete={handleDelete}
                                                    onCreateFolder={async (inDir) => {
                                                        // 直接创建"未命名文件夹"并进入编辑状态
                                                        const actualPath = await createNewFolder('未命名文件夹', inDir)
                                                        if (actualPath) {
                                                            setEditingFolderPath(actualPath)
                                                        }
                                                    }}
                                                    getColor={getColor}
                                                    onColorChange={setColor}
                                                    isRootSelected={false}
                                                    editingPath={editingFolderPath}
                                                    onEditComplete={async (path, newName) => {
                                                        setEditingFolderPath(null)
                                                        // 如果名称变化了，执行重命名
                                                        const currentName = path.split('/').pop() || ''
                                                        if (newName !== currentName) {
                                                            await renameItem(path, newName)
                                                        }
                                                    }}
                                                    onStartEdit={(path) => setEditingFolderPath(path)}
                                                    onMove={async (sourcePath, targetDir) => {
                                                        await moveItem(sourcePath, targetDir)
                                                    }}
                                                    orderedPaths={folderOrder.getOrder('__root__')}
                                                    onReorder={(newOrder) => folderOrder.setOrder('__root__', newOrder)}
                                                />
                                            ) : (
                                                <div className="sidebar-empty-hint">
                                                    {t('sidebar.emptyFolderHint')}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="sidebar-empty-guide">
                                            <div className="empty-icon">🧘</div>
                                            <span className="sidebar-hint">
                                                {t('sidebar.emptyGuide')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 侧边栏右键菜单 (使用 Portal 渲染到 body) */}
                                {sidebarMenu.show && ReactDOM.createPortal(
                                    <div
                                        className="sidebar-menu context-menu"
                                        style={{ left: sidebarMenu.x, top: sidebarMenu.y }}
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        <button onClick={async () => {
                                            // 直接在根目录创建"未命名文件夹"并进入编辑状态
                                            const actualPath = await createNewFolder('未命名文件夹')
                                            if (actualPath) {
                                                setEditingFolderPath(actualPath)
                                            }
                                            setSidebarMenu({ show: false, x: 0, y: 0 })
                                        }}>{t('contextMenu.newFolder')}</button>
                                    </div>,
                                    document.body
                                )}

                                {/* 底部操作按钮 */}
                                <div className="sidebar-footer">
                                    {vaultPath ? (
                                        <>
                                            {/* 设置按钮 + 已链接文件夹按钮 */}
                                            <div className="sidebar-footer-row">
                                                <button
                                                    className="sidebar-footer-btn settings"
                                                    onClick={() => setShowSettings(true)}
                                                    title="设置"
                                                >
                                                    <Settings size={14} strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    className="sidebar-footer-btn connected flex-1"
                                                    onClick={() => {
                                                        // 使用自定义确认对话框
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: '断开链接文件夹',
                                                            message: '这将断开应用与本地文件夹的连接,但不会删除文件夹中的任何文件。',
                                                            details: [
                                                                '您的所有笔记和文件都会保留完好'
                                                            ],
                                                            onConfirm: async () => {
                                                                setConfirmDialog(null)
                                                                // 断开连接：清除存储的路径并重新加载
                                                                await window.fs.disconnectVault()
                                                                window.location.reload()
                                                            }
                                                        })
                                                    }}
                                                    title="断开连接"
                                                >
                                                    <Link size={14} strokeWidth={1.5} />
                                                    <span>{t('sidebar.linkedFolder')}</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            className="sidebar-footer-btn disconnected"
                                            onClick={selectVault}
                                            title="连接本地文件夹"
                                        >
                                            <Unlink size={14} strokeWidth={1.5} />
                                            <span>{t('sidebar.linkLocalFolder')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Panel>
                    </>
                )
                }

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
                                onFormatToggle={() => convertFileFormat(settings.smartFormatConversion)}
                                focusMode={focusMode}
                                createdAt={activeFile.createdAt}
                                modifiedAt={activeFile.modifiedAt}
                            />
                        ) : (
                            /* 画廊视图 */
                            <div className="gallery-view">
                                {!vaultPath ? (
                                    /* CJK 语言环境（中日韩）下使用竖排显示 */
                                    <div className={`unconnected-poetry ${['zh', 'ja', 'ko'].some(lang => i18n.language.startsWith(lang)) ? 'vertical-mode' : ''}`}>
                                        <div className="poetry-content">
                                            <div className="poetry-lines">
                                                <h2 className="poetry-title">{t('emptyState.poem.title')}</h2>
                                                <p className="poetry-line">{t('emptyState.poem.line1')}</p>
                                                <p className="poetry-line">{t('emptyState.poem.line2')}</p>
                                                <p className="poetry-line">{t('emptyState.poem.line3')}</p>
                                                <p className="poetry-line">{t('emptyState.poem.line4')}</p>
                                            </div>
                                            <div className="poetry-meta">
                                                <span>{t('emptyState.poem.meta')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* 画廊头部 - 只有操作按钮 */}
                                        <div className={`gallery-header ${focusMode ? 'focus-mode' : ''}`}>
                                            {/* gallery-actions 已移除排序按钮 */}
                                        </div>

                                        {/* 文件网格 - 第一个永远是新建卡片 */}
                                        <div className="gallery-grid-square">
                                            {/* 新建文章卡片 */}
                                            <div
                                                className="file-card-square create-card"
                                                onClick={handleQuickCreate}
                                            >
                                                <Plus size={32} strokeWidth={1.2} className="create-card-icon" />
                                                <div className="create-card-text">{t('gallery.newArticle')}</div>
                                            </div>

                                            {/* 文件卡片列表 - 使用虚拟排序 */}
                                            {virtualOrderFiles.map((file, index) => {
                                                const style = getCardStyle(file.path)
                                                const preview = previews[file.path] || ''
                                                const isDragging = cardDragSort.draggingPath === file.path
                                                return (
                                                    <div
                                                        key={file.path}
                                                        className={`file-card-square ${isDragging ? 'dragging' : ''}`}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                                type: 'file',
                                                                path: file.path,
                                                                name: file.name,
                                                                index
                                                            }))
                                                            e.dataTransfer.effectAllowed = 'move'
                                                            // 设置拖拽状态
                                                            setCardDragSort({
                                                                draggingPath: file.path,
                                                                hoverIndex: index
                                                            })
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault()
                                                            // 如果悬停在其他卡片上，更新 hoverIndex
                                                            if (cardDragSort.draggingPath && cardDragSort.draggingPath !== file.path) {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                const midX = rect.left + rect.width / 2
                                                                // 根据鼠标在卡片的左/右半边决定插入位置
                                                                const newHoverIndex = e.clientX < midX ? index : index + 1
                                                                if (newHoverIndex !== cardDragSort.hoverIndex) {
                                                                    setCardDragSort(prev => ({
                                                                        ...prev,
                                                                        hoverIndex: newHoverIndex
                                                                    }))
                                                                }
                                                            }
                                                        }}
                                                        onDragEnd={() => {
                                                            // 应用排序
                                                            if (cardDragSort.draggingPath && cardDragSort.hoverIndex !== null) {
                                                                const paths = virtualOrderFiles.map(f => f.path)
                                                                const orderKey = activeFolder?.path || '__root_files__'
                                                                folderOrder.setOrder(orderKey, paths)
                                                            }
                                                            // 重置拖拽状态
                                                            setCardDragSort({ draggingPath: null, hoverIndex: null })
                                                        }}
                                                        onClick={() => openFile(file)}
                                                        onContextMenu={(e) => handleCardContextMenu(e, file)}
                                                        style={{
                                                            borderColor: style.border,
                                                            background: style.bg,
                                                            '--card-shadow-color': style.shadow
                                                        } as React.CSSProperties}
                                                    >
                                                        <div className="card-title">
                                                            {file.name.replace(/\.[^/.]+$/, '')}
                                                        </div>
                                                        <div className="card-summary">
                                                            {preview || '...'}
                                                        </div>
                                                        <div className="card-date">
                                                            <span>
                                                                {file.modifiedAt ? (() => {
                                                                    const d = new Date(file.modifiedAt)
                                                                    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                                                                })() : '--'}
                                                            </span>
                                                            <span className={`card-type ${file.extension?.toLowerCase() || 'txt'}`}>
                                                                {file.extension?.toUpperCase() || 'TXT'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>

                {/* 右侧 AI 面板 */}
                {
                    !rightCollapsed && (
                        <>
                            <Panel defaultSize={25} minSize={25} maxSize={25} className="panel-chat">
                                <ChatPanel llm={llm} engineStore={engineStore} openSettings={() => openSettingsPanel('ai')} />
                            </Panel>
                        </>
                    )
                }
            </PanelGroup >

            {/* 画廊右键菜单 (使用 Portal 渲染到 body) */}
            {
                galleryMenu.show && galleryMenu.node && ReactDOM.createPortal(
                    <div
                        className="gallery-menu context-menu"
                        style={{ left: galleryMenu.x, top: galleryMenu.y }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <button onClick={() => handleGalleryAction('rename')}>{t('contextMenu.rename')}</button>

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
                        <button className="danger" onClick={() => handleGalleryAction('delete')}>{t('contextMenu.delete')}</button>
                    </div>,
                    document.body
                )
            }

            {/* 自定义确认对话框 */}
            {confirmDialog?.isOpen && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    details={confirmDialog.details}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </div >
    )
}

export const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
)

export default App
