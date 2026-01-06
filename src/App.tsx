/**
 * 主应用组件
 * Phase 8: 可调整三栏布局 + 增强画廊
 */

import React, { useEffect, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
// 使用 CSS Flexbox 布局替代 react-resizable-panels
// 原 PanelGroup/Panel 组件已移除，改用固定宽度两侧栏目
import {
    Home,
    Plus,
    Minus,
    Link,
    Unlink,
    Settings,
    Pin,
    FolderInput
} from 'lucide-react'

import { TopBar } from './components/TopBar'
import FileTree, { ColorKey } from './components/FileTree'
import SmartFileViewer from './components/viewers/SmartFileViewer'
import ChatPanel from './components/ChatPanel'
import InputDialog from './components/InputDialog'
import { ToastProvider, useToast } from './components/Toast'
import SettingsPanel from './components/Settings'
import ConfirmDialog from './components/ConfirmDialog'
import DropZoneOverlay from './components/DropZoneOverlay'
import { useFileSystem, FileNode } from './hooks/useFileSystem'
import { useLLM } from './hooks/useLLM'
import { useFolderOrder } from './hooks/useFolderOrder'
import { useSettings } from './hooks/useSettings'
import { useEngineStore } from './store/engineStore'
import { useColorTags, TAG_COLORS } from './hooks/useColorTags'
import './styles/index.css'

// 颜色配置已移动到 useColorTags hook
const COLORS = TAG_COLORS

// localStorage 键名
const APP_STORAGE_KEYS = {
    SHOW_SETTINGS: 'witnote-app-show-settings',
    SETTINGS_TAB: 'witnote-app-settings-tab',
    PREVIEW_MODE: 'witnote-app-preview-mode',
    SPLIT_SECONDARY_FILE: 'witnote-app-split-secondary-file',  // 双栏右侧文件路径
}

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
    const { settings, setSetting } = useSettings()
    const colorTags = useColorTags()

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

    // 颜色系统 - 使用 useColorTags hook（存储到 .zennote/color_tags.json）
    const getColor = colorTags.getColorTag
    const setColor = colorTags.setColorTag

    // 排序（默认最新优先 time-desc，点击切换为最早优先 time-asc）
    const [_sortBy, _setSortBy] = useState<SortOption>('time-desc')
    const [filterColor, _setFilterColor] = useState<ColorKey | 'all'>('all')

    // 设置面板状态 - 从 localStorage 恢复
    const [showSettings, setShowSettings] = useState(() => {
        return localStorage.getItem(APP_STORAGE_KEYS.SHOW_SETTINGS) === 'true'
    })
    const [settingsDefaultTab, setSettingsDefaultTab] = useState<'appearance' | 'ai' | 'persona' | 'shortcuts' | 'about'>(() => {
        const saved = localStorage.getItem(APP_STORAGE_KEYS.SETTINGS_TAB)
        if (saved && ['appearance', 'ai', 'persona', 'shortcuts', 'about'].includes(saved)) {
            return saved as 'appearance' | 'ai' | 'persona' | 'shortcuts' | 'about'
        }
        return 'appearance'
    })

    // 预览模式状态 - 从 localStorage 恢复
    const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>(() => {
        const saved = localStorage.getItem(APP_STORAGE_KEYS.PREVIEW_MODE)
        if (saved && ['edit', 'preview', 'split'].includes(saved)) {
            return saved as 'edit' | 'preview' | 'split'
        }
        return 'edit'
    })

    // 保存设置状态到 localStorage
    useEffect(() => {
        localStorage.setItem(APP_STORAGE_KEYS.SHOW_SETTINGS, String(showSettings))
    }, [showSettings])

    useEffect(() => {
        localStorage.setItem(APP_STORAGE_KEYS.SETTINGS_TAB, settingsDefaultTab)
    }, [settingsDefaultTab])

    useEffect(() => {
        localStorage.setItem(APP_STORAGE_KEYS.PREVIEW_MODE, previewMode)
    }, [previewMode])

    // 三态切换：编辑 → 预览 → 分屏 → 编辑
    const togglePreviewMode = (mode?: 'edit' | 'preview' | 'split') => {
        setPreviewMode(prev => {
            // 如果指定了模式，直接切换到该模式
            if (mode) {
                // 切换到编辑模式或预览模式时，清除双栏配置
                if (mode === 'edit' || mode === 'preview') {
                    setPreviewFile(null)
                    localStorage.removeItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE)
                }
                return mode
            }

            // 否则循环切换
            if (prev === 'edit') return 'preview'
            if (prev === 'preview') return 'split'
            // 切换回编辑模式时，关闭双栏
            setPreviewFile(null)
            localStorage.removeItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE)
            return 'edit'
        })
    }



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

    // 搜索状态
    const [searchQuery, setSearchQuery] = useState('')

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

    // 拖拽放置区状态
    const [dropZoneVisible, setDropZoneVisible] = useState(false)
    const [isDragging, setIsDragging] = useState(false)  // 全局拖拽状态，用于禁用 iframe

    // 全局拖拽文件信息（用于跨文件夹拖拽检测）
    const [draggingFile, setDraggingFile] = useState<{ path: string; name: string; parentPath: string } | null>(null)

    // 卡片区域拖拽提示状态
    const [galleryDragInfo, setGalleryDragInfo] = useState<{
        visible: boolean
        fileName: string
        targetFolder: string
    }>({ visible: false, fileName: '', targetFolder: '' })


    // 监听全局拖拽事件，用于禁用 iframe 的指针事件
    useEffect(() => {
        const handleDragEnter = () => setIsDragging(true)
        const handleDragEnd = () => {
            setIsDragging(false)
            setDraggingFile(null)
            setGalleryDragInfo({ visible: false, fileName: '', targetFolder: '' })
        }
        const handleDrop = () => {
            setIsDragging(false)
            setDraggingFile(null)
            setGalleryDragInfo({ visible: false, fileName: '', targetFolder: '' })
        }

        document.addEventListener('dragenter', handleDragEnter)
        document.addEventListener('dragend', handleDragEnd)
        document.addEventListener('drop', handleDrop)

        return () => {
            document.removeEventListener('dragenter', handleDragEnter)
            document.removeEventListener('dragend', handleDragEnd)
            document.removeEventListener('drop', handleDrop)
        }
    }, [])




    const {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        previewFile,
        fileContent,
        isNewlyCreatedFile,
        selectVault,
        openFile,
        selectFolder,
        setPreviewFile,
        isEditable,
        getAllFiles,
        setFileContent,
        convertFileFormat,
        createNewFile,
        createNewFolder,
        renameItem,
        deleteFile,
        moveItem,
    } = fileSystem

    // 双栏布局模式计算
    const layoutMode = useMemo(() => {
        return (activeFile && previewFile) ? 'dual' : 'single'
    }, [activeFile, previewFile])

    // 加载文件摘要函数
    const loadFilePreviews = async (files: FileNode[]): Promise<Map<string, string>> => {
        const previewMap = new Map<string, string>();
        const PREVIEW_LENGTH = 80; // 每个文件摘要长度

        // 只预览可编辑的文本文件 (跳过 PDF, DOCX 等二进制文件)
        const textFiles = files.filter(file => {
            const ext = file.extension?.toLowerCase() || ''
            return ['.md', '.txt', '.markdown'].includes(ext)
        })

        // 限制并发数量
        const filesToLoad = textFiles.slice(0, 15); // 最多加载 15 个文件

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


                } else {
                    // 已有内容的文件：加载聊天记录
                    llm.loadChatHistory(activeFile.path)
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
                // 跳过二进制文件 (PDF, DOCX)
                const ext = file.extension?.toLowerCase() || ''
                if (!['.md', '.txt', '.markdown'].includes(ext)) {
                    continue
                }

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
            // 强制进入编辑模式
            setPreviewMode('edit')
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

        // 监听编辑模式切换快捷方式 (Cmd+E)
        const unsubCycleEditorMode = window.shortcuts.onCycleEditorMode(() => {
            setPreviewMode(prev => {
                if (prev === 'edit') return 'preview'
                if (prev === 'preview') return 'split'
                return 'edit'
            })
        })

        // 监听智能续写切换快捷方式 (Cmd+Shift+A)
        const unsubToggleSmartAutocomplete = window.shortcuts.onToggleSmartAutocomplete(async () => {
            const newValue = !settings.autocompleteEnabled
            await setSetting('autocompleteEnabled', newValue)
            // 同步状态到主进程菜单
            window.shortcuts.syncSmartAutocomplete(newValue)
        })

        return () => {
            unsubCreateArticle()
            unsubCreateFolder()
            unsubOpenSettings()
            unsubToggleFocusMode()
            unsubCycleEditorMode()
            unsubToggleSmartAutocomplete()
        }
    }, [activeFolder, settings.defaultFormat, createNewFile, autoHideLeft, autoHideRight, manualFocusMode, settings.autocompleteEnabled, setSetting])

    // 同步智能续写状态到菜单（初始化和设置面板切换时）
    useEffect(() => {
        if (window.shortcuts?.syncSmartAutocomplete) {
            window.shortcuts.syncSmartAutocomplete(settings.autocompleteEnabled)
        }
    }, [settings.autocompleteEnabled])

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

    // 颜色系统 - getColor/setColor 已在 useColorTags hook 中定义（见第 159-160 行）

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

        // 搜索过滤
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase()
            files = files.filter(f => {
                // 按文件名搜索
                const nameMatch = f.name.toLowerCase().includes(query)
                // 按预览内容搜索
                const contentMatch = previews[f.path]?.toLowerCase().includes(query)
                return nameMatch || contentMatch
            })
        }

        // 排序逻辑：
        // 1. 获取保存的顺序列表
        // 2. 新文件（不在列表中的）按时间倒序插入到列表开头
        // 3. 按列表顺序排序
        // 4. 图钉固定的文件始终排在最前面
        const orderKey = activeFolder?.path || '__root_files__'
        const customOrder = folderOrder.getOrder(orderKey)

        // 先按时间倒序排列所有文件
        const sortedByTime = [...files].sort((a, b) => {
            return (b.modifiedAt || 0) - (a.modifiedAt || 0)
        })

        let sortedFiles: typeof files

        if (customOrder.length === 0) {
            // 没有自定义顺序，直接按时间倒序
            sortedFiles = sortedByTime
        } else {
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
            sortedFiles = sortedByTime.sort((a, b) => {
                const indexA = updatedOrder.indexOf(a.path)
                const indexB = updatedOrder.indexOf(b.path)
                if (indexA === -1 && indexB === -1) return 0
                if (indexA === -1) return 1
                if (indexB === -1) return -1
                return indexA - indexB
            })
        }

        // 图钉固定的文件始终排在最前面
        const pinnedFiles = sortedFiles.filter(f => folderOrder.isPinned(f.path))
        const unpinnedFiles = sortedFiles.filter(f => !folderOrder.isPinned(f.path))
        return [...pinnedFiles, ...unpinnedFiles]
    }, [currentFiles, filterColor, getColor, activeFolder?.path, folderOrder, searchQuery, previews])

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

    // 恢复双栏副文件（持久化恢复）
    useEffect(() => {
        if (!isInitialized || !fileTree.length) return

        // 只有在双栏模式且预览文件为空时才尝试恢复
        if (previewMode !== 'split' || previewFile) return

        const secondaryPath = localStorage.getItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE)
        if (!secondaryPath) return

        // 递归查找文件节点
        const findNode = (nodes: FileNode[], path: string): FileNode | null => {
            for (const node of nodes) {
                if (node.path === path) return node
                if (node.children) {
                    const found = findNode(node.children, path)
                    if (found) return found
                }
            }
            return null
        }

        const node = findNode(fileTree, secondaryPath)
        if (node) {
            setPreviewFile(node)
        }
    }, [isInitialized, fileTree, previewMode, previewFile])

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
        const currentFile = activeFile
        const shouldSplit = currentFile && !isEditable(currentFile)

        const fileName = generateFileName(settings.defaultFormat)

        // 阅读只读文件时新建 → 原文件移至右栏
        if (shouldSplit) {
            setPreviewFile(currentFile)
            // 自动进入双栏模式
            if (previewMode !== 'split') {
                setPreviewMode('split')
                localStorage.setItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE, currentFile.path)
            }
        }

        // 强制进入编辑模式（如果是单栏，则是编辑模式；如果是双栏，保持双栏但主文件可编辑）
        // 这里如果是双栏模式，我们希望保持 split，只是主文件变成新的
        if (previewMode !== 'split') {
            setPreviewMode('edit')
        }

        await createNewFile(fileName)
    }

    // T1-3: 点击文件时的双栏逻辑处理
    const handleFileSelect = (node: FileNode) => {
        const isNodeEditable = isEditable(node)

        // 自动展开父文件夹，确保文件在文件树中可见
        folderOrder.expandToPath(node.path)

        // 延迟滚动到文件位置（等待 DOM 更新完成）
        setTimeout(() => {
            // 查找对应的文件元素并滚动到可视区域
            const fileElement = document.querySelector(`[data-file-path="${CSS.escape(node.path)}"]`)
            if (fileElement) {
                fileElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
        }, 100)

        // 场景 A：正在编辑可编辑文件，点击只读文件 → 推入右栏预览
        if (activeFile && isEditable(activeFile) && !isNodeEditable) {
            setPreviewFile(node)
            // 自动进入双栏模式
            if (previewMode !== 'split') {
                setPreviewMode('split')
            }
            // 保存持久化状态
            localStorage.setItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE, node.path)
            return
        }

        // 场景 B：点击可编辑文件
        if (isNodeEditable) {
            // 如果当前在双栏模式，且已经有副文件，我们希望保持双栏，只换主文件
            if (previewMode === 'split') {
                openFile(node)
                // 不清除 previewFile，保持双栏状态
                return
            }

            // 否则（单栏模式），清除预览，打开文件
            setPreviewFile(null)
            openFile(node)
            return
        }

        // 默认：作为主文件打开（如阅读只读文件时点击另一个只读文件）
        setPreviewFile(null)
        openFile(node)

        // 如果打开的是只读文件，自动切换到预览模式
        // 这样可以避免用户卡在无法使用的 split 或 edit 模式
        if (!isNodeEditable && previewMode !== 'preview') {
            setPreviewMode('preview')
        }
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

    // ========== 拖拽到编辑区处理 ==========
    // 处理编辑区的拖拽进入
    const handleEditorDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // 只有在编辑文件时才显示放置区
        if (!activeFile) return

        // 检查是否是文件树拖拽
        try {
            const types = e.dataTransfer.types
            if (types.includes('application/json')) {
                setDropZoneVisible(true)
            }
        } catch {
            // 忽略
        }
    }

    // 处理拖拽离开
    const handleEditorDragLeave = () => {
        setDropZoneVisible(false)
    }

    // 处理放置到左侧或右侧
    const handleEditorDrop = (position: 'left' | 'right', e: React.DragEvent) => {
        // 先重置状态，确保界面不会卡住
        setDropZoneVisible(false)

        if (!activeFile) return

        // 尝试从事件中获取文件路径
        let targetPath = ''
        try {
            const data = e.dataTransfer.getData('application/json')
            if (data) {
                const parsed = JSON.parse(data)
                if (parsed.path && parsed.type === 'file') {
                    targetPath = parsed.path
                }
            }
        } catch (err) {
            console.error('Failed to parse drop data', err)
            return
        }

        if (!targetPath) return

        // 查找拖拽的文件节点
        const findNode = (nodes: FileNode[], path: string): FileNode | null => {
            for (const node of nodes) {
                if (node.path === path) return node
                if (node.children) {
                    const found = findNode(node.children, path)
                    if (found) return found
                }
            }
            return null
        }

        const droppedFile = findNode(fileTree, targetPath)
        if (!droppedFile) return

        // 如果拖拽的是同一个文件（activeFile 或 previewFile），忽略
        if (droppedFile.path === activeFile.path) return
        if (previewFile && droppedFile.path === previewFile.path) return

        // 设置双栏模式
        if (position === 'right') {
            // 拖拽的文件放到右侧预览
            setPreviewFile(droppedFile)
        } else {
            // 拖拽的文件放到左侧，当前文件移到右侧
            setPreviewFile(activeFile)
            openFile(droppedFile)
        }

        // 自动切换到双栏预览模式
        setPreviewMode('split')

        // 保存双栏配置到 localStorage
        const secondaryPath = position === 'right' ? droppedFile.path : activeFile.path
        localStorage.setItem(APP_STORAGE_KEYS.SPLIT_SECONDARY_FILE, secondaryPath)
    }



    // 处理拖拽进入放置区时记录文件信息
    const handleDropZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        // dragover 事件可能无法获取数据，仅用于防止默认行为
    }


    return (
        <div className="app-root">
            {/* Unified TopBar covering all columns */}
            <TopBar
                leftCollapsed={leftCollapsed}
                rightCollapsed={rightCollapsed}
                activeFile={activeFile}
                previewFile={previewFile}
                fileContent={fileContent}
                isMarkdown={activeFile?.extension === '.md' || activeFile?.extension === '.markdown'}
                onFormatToggle={(format) => {
                    // 根据请求的格式执行转换
                    if (format === 'md' || format === 'txt') {
                        convertFileFormat(settings.smartFormatConversion)
                    }
                    // PDF 暂不支持转换
                }}
                previewMode={previewMode}
                onPreviewModeChange={togglePreviewMode}
                focusMode={focusMode}
                onFocusModeChange={toggleFocusMode}
                currentEngine={engineStore.currentEngine}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />



            {/* Remove titlebar-drag-region as TopBar handles it */}
            {/* <div className="titlebar-drag-region" /> */}

            {/* 右上角按钮组已移至 TopBar 中 */}

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
            {/* 可调整三栏布局 -> 固定宽度 Flex 布局 */}
            <div className="app-layout">
                {/* 左侧边栏 */}
                {!leftCollapsed && (
                    <div className="panel-sidebar">
                        <div className="sidebar-inner">
                            {/* 侧边栏头部已移除，使用 TopBar */}

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
                                                // 计算新路径和父目录 key
                                                const name = data.path.split('/').pop() || ''
                                                const newPath = name
                                                const oldParentKey = data.path.includes('/')
                                                    ? data.path.substring(0, data.path.lastIndexOf('/')) || '__root_files__'
                                                    : '__root_files__'

                                                // 移动到根目录
                                                const success = await moveItem(data.path, '')

                                                // 同步更新属性路径
                                                if (success) {
                                                    colorTags.updatePath(data.path, newPath)
                                                    folderOrder.updatePinnedPath(data.path, newPath)
                                                    folderOrder.updateOrderPath(data.path, newPath, oldParentKey, '__root_files__')
                                                }
                                            }
                                        } catch {
                                            console.error('拖拽数据解析失败')
                                        }
                                    }
                                }}
                            >
                                <div className="topbar-spacer" />
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
                                                        // 计算新路径和父目录 key
                                                        const name = data.path.split('/').pop() || ''
                                                        const newPath = name
                                                        const oldParentKey = data.path.includes('/')
                                                            ? data.path.substring(0, data.path.lastIndexOf('/')) || '__root_files__'
                                                            : '__root_files__'

                                                        // 移动到根目录
                                                        const success = await moveItem(data.path, '')

                                                        // 同步更新属性路径
                                                        if (success) {
                                                            colorTags.updatePath(data.path, newPath)
                                                            folderOrder.updatePinnedPath(data.path, newPath)
                                                            folderOrder.updateOrderPath(data.path, newPath, oldParentKey, '__root_files__')
                                                        }
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
                                                openedFilePaths={[
                                                    ...(activeFile ? [activeFile.path] : []),
                                                    ...(previewFile ? [previewFile.path] : [])
                                                ]}
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
                                                onMove={async (sourcePath, targetDir, insertAfter) => {
                                                    // 计算新路径和父目录 key
                                                    const name = sourcePath.split('/').pop() || ''
                                                    const newPath = targetDir ? `${targetDir}/${name}` : name
                                                    const oldParentKey = sourcePath.includes('/')
                                                        ? sourcePath.substring(0, sourcePath.lastIndexOf('/')) || '__root_files__'
                                                        : '__root_files__'
                                                    const newParentKey = targetDir || '__root_files__'

                                                    // 移动文件
                                                    const success = await moveItem(sourcePath, targetDir)

                                                    // 移动成功后同步更新属性路径
                                                    if (success) {
                                                        colorTags.updatePath(sourcePath, newPath)
                                                        folderOrder.updatePinnedPath(sourcePath, newPath)
                                                        folderOrder.updateOrderPath(sourcePath, newPath, oldParentKey, newParentKey)

                                                        // 如果指定了插入位置，更新排序
                                                        if (insertAfter !== undefined) {
                                                            const currentOrder = folderOrder.getOrder(newParentKey)
                                                            // 移除新文件路径（可能已在末尾）
                                                            const filteredOrder = currentOrder.filter(p => p !== newPath)

                                                            if (insertAfter === '') {
                                                                // insertAfter 为空字符串表示插入到开头
                                                                filteredOrder.unshift(newPath)
                                                            } else {
                                                                // 找到 insertAfter 的位置，在其后插入
                                                                const afterIndex = filteredOrder.indexOf(insertAfter)
                                                                if (afterIndex !== -1) {
                                                                    filteredOrder.splice(afterIndex + 1, 0, newPath)
                                                                } else {
                                                                    // 找不到就插入到开头
                                                                    filteredOrder.unshift(newPath)
                                                                }
                                                            }
                                                            folderOrder.setOrder(newParentKey, filteredOrder)
                                                        }
                                                    }
                                                }}

                                                orderedPaths={folderOrder.getOrder('__root__')}
                                                onReorder={(newOrder) => folderOrder.setOrder('__root__', newOrder)}
                                                onFileReorder={(folderPath, newOrder) => folderOrder.setOrder(folderPath, newOrder)}
                                                getOrder={folderOrder.getOrder}
                                                isPinned={folderOrder.isPinned}
                                                onTogglePin={folderOrder.togglePin}
                                                isExpanded={folderOrder.isExpanded}
                                                onToggleExpanded={folderOrder.toggleExpanded}
                                                onFileDragStart={(file) => setDraggingFile(file)}
                                                onFileDragEnd={() => setDraggingFile(null)}
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
                                                        title: t('sidebar.disconnectTitle'),
                                                        message: t('sidebar.disconnectMessage'),
                                                        details: [
                                                            t('sidebar.disconnectDetail')
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
                    </div>

                )
                }

                {/* 中间内容区 */}
                <div
                    className={`panel-main ${isDragging || dropZoneVisible ? 'dragging-over' : ''}`}

                    onDragOver={handleEditorDragOver}
                    onDragEnter={handleDropZoneDragOver}
                    onDrop={(e) => {
                        e.preventDefault()
                        // 如果放置区不可见，不处理
                        if (!dropZoneVisible) return
                    }}
                    onDragLeave={(e) => {
                        // 检查是否真的离开了 panel-main
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX
                        const y = e.clientY
                        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                            setDropZoneVisible(false)
                        }
                    }}
                >
                    {/* 拖拽放置区覆盖层 */}
                    <DropZoneOverlay
                        visible={dropZoneVisible}
                        onDrop={handleEditorDrop}
                        onDragLeave={handleEditorDragLeave}
                    />

                    <div className="main-inner">
                        {activeFile ? (

                            layoutMode === 'dual' && previewFile ? (
                                // 双栏布局：两个不同文件并排显示
                                // 主文件使用 'edit' 模式（不使用 split，避免再次分屏预览）
                                <div className="dual-pane-layout">
                                    <div className="main-pane">
                                        <SmartFileViewer
                                            file={activeFile}
                                            vaultPath={vaultPath || ''}
                                            content={fileContent}
                                            onChange={setFileContent}
                                            onTitleChange={handleTitleChange}
                                            onFormatToggle={() => convertFileFormat(settings.smartFormatConversion)}
                                            focusMode={focusMode}
                                            previewMode="edit"
                                            createdAt={activeFile.createdAt}
                                            modifiedAt={activeFile.modifiedAt}
                                            onPreviewModeChange={setPreviewMode}
                                            engineStore={engineStore}
                                        />
                                    </div>

                                    <div className="pane-divider" />
                                    <div className="preview-pane">
                                        <SmartFileViewer
                                            file={previewFile}
                                            vaultPath={vaultPath || ''}
                                            content={''}  // 预览文件不需要内容（只读模式）
                                            onChange={() => { }}  // 只读不可编辑
                                            onTitleChange={() => { }}
                                            onFormatToggle={() => { }}
                                            focusMode={false}
                                            previewMode="preview"
                                            isPreviewPane={true}  // 标记为预览窗格
                                            onClose={() => setPreviewFile(null)}  // 关闭预览
                                            engineStore={engineStore}
                                        />
                                    </div>
                                </div>
                            ) : (
                                // 单栏布局
                                <SmartFileViewer
                                    file={activeFile}
                                    vaultPath={vaultPath || ''}
                                    content={fileContent}
                                    onChange={setFileContent}
                                    onTitleChange={handleTitleChange}
                                    onFormatToggle={() => convertFileFormat(settings.smartFormatConversion)}
                                    focusMode={focusMode}
                                    previewMode={previewMode}
                                    createdAt={activeFile.createdAt}
                                    modifiedAt={activeFile.modifiedAt}
                                    onPreviewModeChange={setPreviewMode}
                                    engineStore={engineStore}
                                />
                            )
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
                                    <div
                                        className="gallery-wrapper"
                                        onDragOver={(e) => {
                                            // 允许接收从文件树拖拽的文件
                                            e.preventDefault()
                                            // 使用 draggingFile 状态检测跨文件夹拖拽
                                            if (draggingFile && !galleryDragInfo.visible) {
                                                const currentFolderPath = activeFolder?.path || ''
                                                if (draggingFile.parentPath !== currentFolderPath) {
                                                    setGalleryDragInfo({
                                                        visible: true,
                                                        fileName: draggingFile.name,
                                                        targetFolder: activeFolder?.name || t('gallery.rootFolder', '根目录')
                                                    })
                                                }
                                            }
                                        }}
                                        onDragEnter={(e) => {
                                            e.preventDefault()
                                            // 使用 draggingFile 状态显示提示
                                            if (draggingFile && !galleryDragInfo.visible) {
                                                const currentFolderPath = activeFolder?.path || ''
                                                if (draggingFile.parentPath !== currentFolderPath) {
                                                    setGalleryDragInfo({
                                                        visible: true,
                                                        fileName: draggingFile.name,
                                                        targetFolder: activeFolder?.name || t('gallery.rootFolder', '根目录')
                                                    })
                                                }
                                            }
                                        }}
                                        onDragLeave={(e) => {
                                            // 检查是否真的离开了画廊区域
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            const x = e.clientX
                                            const y = e.clientY
                                            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                                setGalleryDragInfo({ visible: false, fileName: '', targetFolder: '' })
                                            }
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault()
                                            // 隐藏提示
                                            setGalleryDragInfo({ visible: false, fileName: '', targetFolder: '' })
                                            // 检查是否是从文件树拖拽的外部文件（不同文件夹）
                                            try {
                                                const data = JSON.parse(e.dataTransfer.getData('application/json'))
                                                if (data.type === 'file' && data.path) {
                                                    // 检查是否是当前文件夹的文件
                                                    const currentFolderPath = activeFolder?.path || ''
                                                    const fileParent = data.path.includes('/')
                                                        ? data.path.substring(0, data.path.lastIndexOf('/'))
                                                        : ''

                                                    // 如果是不同文件夹的文件，执行移动
                                                    if (fileParent !== currentFolderPath) {
                                                        const name = data.path.split('/').pop() || ''
                                                        const newPath = currentFolderPath ? `${currentFolderPath}/${name}` : name
                                                        const oldParentKey = fileParent || '__root_files__'
                                                        const newParentKey = currentFolderPath || '__root_files__'

                                                        const success = await moveItem(data.path, currentFolderPath)
                                                        if (success) {
                                                            colorTags.updatePath(data.path, newPath)
                                                            folderOrder.updatePinnedPath(data.path, newPath)
                                                            folderOrder.updateOrderPath(data.path, newPath, oldParentKey, newParentKey)
                                                        }
                                                    }
                                                }
                                            } catch {
                                                // 忽略本地卡片拖拽（由卡片自己的 onDragEnd 处理）
                                            }
                                        }}
                                    >
                                        {/* 拖拽到卡片区的提示覆盖层 - 占满整个画廊区域 */}
                                        {galleryDragInfo.visible && (
                                            <div className="gallery-drop-overlay">
                                                <div className="gallery-drop-content">
                                                    <FolderInput size={32} strokeWidth={1.5} />
                                                    <span>{t('gallery.moveFileHint', '移动到')} <strong>{galleryDragInfo.targetFolder}</strong></span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 卡片滚动区域 */}
                                        <div className="gallery-scroll-container">
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
                                                            onDrop={async (e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                // 检查是否是从文件树拖拽的外部文件
                                                                try {
                                                                    const data = JSON.parse(e.dataTransfer.getData('application/json'))
                                                                    if (data.type === 'file' && data.path) {
                                                                        const currentFolderPath = activeFolder?.path || ''
                                                                        const fileParent = data.path.includes('/')
                                                                            ? data.path.substring(0, data.path.lastIndexOf('/'))
                                                                            : ''

                                                                        // 如果是不同文件夹的文件，执行移动并插入到指定位置
                                                                        if (fileParent !== currentFolderPath) {
                                                                            const name = data.path.split('/').pop() || ''
                                                                            const newPath = currentFolderPath ? `${currentFolderPath}/${name}` : name
                                                                            const oldParentKey = fileParent || '__root_files__'
                                                                            const newParentKey = currentFolderPath || '__root_files__'

                                                                            const success = await moveItem(data.path, currentFolderPath)
                                                                            if (success) {
                                                                                colorTags.updatePath(data.path, newPath)
                                                                                folderOrder.updatePinnedPath(data.path, newPath)
                                                                                folderOrder.updateOrderPath(data.path, newPath, oldParentKey, newParentKey)

                                                                                // 根据鼠标位置确定插入位置
                                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                                const isLeft = e.clientX < rect.left + rect.width / 2
                                                                                const insertAfter = isLeft ?
                                                                                    (index > 0 ? virtualOrderFiles[index - 1].path : undefined) :
                                                                                    file.path

                                                                                // 更新排序
                                                                                const currentOrder = folderOrder.getOrder(newParentKey)
                                                                                const filteredOrder = currentOrder.filter(p => p !== newPath)
                                                                                if (insertAfter === undefined) {
                                                                                    filteredOrder.unshift(newPath)
                                                                                } else {
                                                                                    const afterIndex = filteredOrder.indexOf(insertAfter)
                                                                                    if (afterIndex !== -1) {
                                                                                        filteredOrder.splice(afterIndex + 1, 0, newPath)
                                                                                    } else {
                                                                                        filteredOrder.push(newPath)
                                                                                    }
                                                                                }
                                                                                folderOrder.setOrder(newParentKey, filteredOrder)
                                                                            }
                                                                        }
                                                                    }
                                                                } catch {
                                                                    // 忽略本地卡片拖拽
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

                                                            onClick={() => handleFileSelect(file)}
                                                            onContextMenu={(e) => handleCardContextMenu(e, file)}
                                                            style={{
                                                                borderColor: style.border,
                                                                background: style.bg,
                                                                '--card-shadow-color': style.shadow
                                                            } as React.CSSProperties}
                                                        >
                                                            <div className="card-title">
                                                                {folderOrder.isPinned(file.path) && (
                                                                    <Pin size={12} className="pin-icon" />
                                                                )}
                                                                {file.name.replace(/\.[^/.]+$/, '')}
                                                            </div>
                                                            <div className="card-summary">
                                                                {(() => {
                                                                    const ext = file.extension?.toLowerCase()
                                                                    if (ext === '.pdf' || ext === '.docx') return '只读预览 / 不可编辑'
                                                                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext || '')) return '预览图片'
                                                                    return preview || '...'
                                                                })()}
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

                                                            {/* 文件类型水印 - 所有文件类型 */}
                                                            {!file.isDirectory && (() => {
                                                                const ext = file.extension?.toLowerCase()
                                                                let watermark = ''
                                                                if (ext === '.pdf') watermark = 'P'
                                                                else if (ext === '.docx') watermark = 'W'
                                                                else if (ext === '.txt') watermark = 'T'
                                                                else if (ext === '.md' || ext === '.markdown') watermark = 'M'
                                                                else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext || '')) watermark = 'I'

                                                                return watermark ? (
                                                                    <div className="file-type-watermark">
                                                                        {watermark}
                                                                    </div>
                                                                ) : null
                                                            })()}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧 AI 面板 */}
                {
                    !rightCollapsed && (

                        <div className="panel-chat">
                            <ChatPanel llm={llm} engineStore={engineStore} openSettings={() => openSettingsPanel('ai')} />
                        </div>

                    )
                }
            </div>

            {/* 画廊右键菜单 (使用 Portal 渲染到 body) */}
            {
                galleryMenu.show && galleryMenu.node && ReactDOM.createPortal(
                    <div
                        className="gallery-menu context-menu"
                        style={{ left: galleryMenu.x, top: galleryMenu.y }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <button onClick={() => handleGalleryAction('rename')}>{t('contextMenu.rename')}</button>

                        {/* 图钉按钮 */}
                        <button
                            onClick={() => {
                                if (galleryMenu.node) {
                                    folderOrder.togglePin(galleryMenu.node.path)
                                }
                                setGalleryMenu({ show: false, x: 0, y: 0, node: null })
                            }}
                            className={folderOrder.isPinned(galleryMenu.node?.path || '') ? 'active' : ''}
                        >
                            <Pin size={14} style={{ marginRight: 6 }} />
                            {folderOrder.isPinned(galleryMenu.node?.path || '') ? t('contextMenu.unpin') : t('contextMenu.pin')}
                        </button>

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
            {
                confirmDialog?.isOpen && (
                    <ConfirmDialog
                        title={confirmDialog.title}
                        message={confirmDialog.message}
                        details={confirmDialog.details}
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
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
