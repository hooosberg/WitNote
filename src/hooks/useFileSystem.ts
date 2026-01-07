/**
 * useFileSystem Hook
 * 管理文件系统操作、文件树和实时监听
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

// 文件类型常量
export const EDITABLE_EXTENSIONS = ['.md', '.txt']
export const VIEWABLE_EXTENSIONS = ['.pdf', '.docx']
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
export const ALL_ALLOWED_EXTENSIONS = [
    ...EDITABLE_EXTENSIONS,
    ...VIEWABLE_EXTENSIONS,
    ...IMAGE_EXTENSIONS
]

// 文件节点类型
export interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    extension?: string
    createdAt?: number   // 创建时间戳（毫秒）
    modifiedAt?: number  // 修改时间戳（毫秒）
}

// 文件变化事件
interface FileChangeEvent {
    type: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'
    path: string
}

/**
 * 从 Markdown 内容中提取 .images/ 目录下的图片路径
 */
function extractImagePaths(content: string): string[] {
    const regex = /!\[.*?\]\(([^)]+)\)/g
    const matches = [...content.matchAll(regex)]
    return matches
        .map(m => m[1])
        .filter(p => p.startsWith('.images/'))
}

// Hook 返回类型
export interface UseFileSystemReturn {
    // 状态
    vaultPath: string | null
    isInitialized: boolean
    fileTree: FileNode[]
    activeFile: FileNode | null
    activeFolder: FileNode | null
    previewFile: FileNode | null  // 双栏布局右侧预览文件
    fileContent: string
    isLoading: boolean
    isNewlyCreatedFile: boolean  // 新创建的文件标志

    // 方法
    selectVault: () => Promise<boolean>
    refreshTree: () => Promise<void>
    openFile: (node: FileNode) => Promise<void>
    selectFolder: (node: FileNode | null) => void
    setPreviewFile: (file: FileNode | null) => void  // 设置预览文件
    isEditable: (file: FileNode) => boolean  // 判断文件是否可编辑
    getAllFiles: () => FileNode[]  // 递归获取所有文件
    saveFile: () => Promise<void>
    setFileContent: (content: string) => void
    createNewFile: (name: string, inDirectory?: string) => Promise<void>
    createNewFolder: (name: string, inDirectory?: string) => Promise<string | null>
    deleteFile: (path: string) => Promise<void>
    renameItem: (oldPath: string, newName: string) => Promise<void>
    convertFileFormat: (smartConversion?: boolean) => Promise<void>
    moveItem: (sourcePath: string, targetDir: string) => Promise<boolean>  // 移动文件/文件夹
    exportToPdf: () => Promise<{ success: boolean, error?: string }>  // 导出 MD 为 PDF
}

// localStorage 键名
const STORAGE_KEYS = {
    ACTIVE_FILE_PATH: 'witnote-active-file-path',
    ACTIVE_FOLDER_PATH: 'witnote-active-folder-path',
}

export function useFileSystem(): UseFileSystemReturn {
    const { t } = useTranslation()
    // Vault 状态
    const [vaultPath, setVaultPath] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // 文件树状态
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // 当前文件/文件夹状态
    const [activeFile, setActiveFile] = useState<FileNode | null>(null)
    const [activeFolder, setActiveFolder] = useState<FileNode | null>(null)
    const [previewFile, setPreviewFile] = useState<FileNode | null>(null)  // 双栏布局右侧预览文件
    const [fileContent, setFileContent] = useState('')
    const [isNewlyCreatedFile, setIsNewlyCreatedFile] = useState(false)

    // 标记是否已恢复状态
    const stateRestoredRef = useRef(false)

    // 防抖保存定时器
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastContentRef = useRef<string>('')
    const isRenamingRef = useRef(false)  // 重命名操作标志，防止 unlink 事件清空编辑器

    /**
     * 初始化：检查是否已有 Vault
     */
    useEffect(() => {
        const init = async () => {
            try {
                const path = await window.fs.getVaultPath()
                if (path) {
                    setVaultPath(path)
                    await window.fs.watch(path)
                }
                setIsInitialized(true)
            } catch (error) {
                console.error('初始化文件系统失败:', error)
                setIsInitialized(true)
            }
        }
        init()

        // 清理
        return () => {
            window.fs.unwatch()
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
            }
        }
    }, [])

    /**
     * 监听文件变化
     */
    useEffect(() => {
        if (!vaultPath) return

        const cleanup = window.fs.onFileChange((event: FileChangeEvent) => {
            console.log('📁 文件变化:', event.type, event.path)
            refreshTree()

            // 如果当前打开的文件被删除，清空编辑器
            // 注意：重命名操作会触发 unlink 事件，此时不应清空编辑器
            if (event.type === 'unlink' && activeFile?.path === event.path && !isRenamingRef.current) {
                setActiveFile(null)
                setFileContent('')
            }
        })

        return cleanup
    }, [vaultPath, activeFile])

    /**
     * Vault 路径变化时刷新文件树并恢复视图状态
     */
    useEffect(() => {
        const initVault = async () => {
            if (!vaultPath) return

            // 先刷新文件树
            setIsLoading(true)
            try {
                const tree = await window.fs.readDirectory()
                setFileTree(tree)

                // 如果还没恢复状态，尝试恢复
                if (!stateRestoredRef.current) {
                    stateRestoredRef.current = true

                    // 恢复 activeFile
                    const savedFilePath = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_PATH)
                    if (savedFilePath) {
                        const fileNode = findNodeByPath(tree, savedFilePath)
                        if (fileNode && !fileNode.isDirectory) {
                            // 读取文件内容并设置活动文件
                            try {
                                const content = await window.fs.readFile(fileNode.path)
                                setActiveFile(fileNode)
                                setFileContent(content)
                                lastContentRef.current = content
                                console.log('📂 恢复活动文件:', fileNode.path)
                            } catch (e) {
                                console.error('恢复文件失败:', e)
                                localStorage.removeItem(STORAGE_KEYS.ACTIVE_FILE_PATH)
                            }
                        } else {
                            localStorage.removeItem(STORAGE_KEYS.ACTIVE_FILE_PATH)
                        }
                    }

                    // 恢复 activeFolder（只有在没有 activeFile 时才恢复文件夹视图）
                    if (!savedFilePath) {
                        const savedFolderPath = localStorage.getItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH)
                        if (savedFolderPath) {
                            const folderNode = findNodeByPath(tree, savedFolderPath)
                            if (folderNode && folderNode.isDirectory) {
                                setActiveFolder(folderNode)
                                console.log('📁 恢复活动文件夹:', folderNode.path)
                            } else {
                                localStorage.removeItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH)
                            }
                        }
                    } else {
                        // 如果有 activeFile，同时设置其父文件夹
                        const savedFilePath2 = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILE_PATH)
                        if (savedFilePath2) {
                            const parentPath = savedFilePath2.includes('/')
                                ? savedFilePath2.substring(0, savedFilePath2.lastIndexOf('/'))
                                : null
                            if (parentPath) {
                                const parentNode = findNodeByPath(tree, parentPath)
                                setActiveFolder(parentNode)
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('初始化文件树失败:', error)
            } finally {
                setIsLoading(false)
            }
        }
        initVault()
    }, [vaultPath])

    /**
     * 递归查找文件夹节点
     */
    const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
        for (const node of nodes) {
            if (node.path === path) return node
            if (node.children) {
                const found = findNodeByPath(node.children, path)
                if (found) return found
            }
        }
        return null
    }

    /**
     * 刷新文件树
     */
    const refreshTree = useCallback(async () => {
        if (!vaultPath) return

        setIsLoading(true)
        try {
            const tree = await window.fs.readDirectory()
            setFileTree(tree)

            // 同步更新 activeFolder（从新的 tree 中找到对应节点）
            if (activeFolder) {
                const updatedFolder = findNodeByPath(tree, activeFolder.path)
                if (updatedFolder) {
                    setActiveFolder(updatedFolder)
                } else {
                    // 文件夹被删除，回到根目录
                    setActiveFolder(null)
                }
            }
        } catch (error) {
            console.error('刷新文件树失败:', error)
        } finally {
            setIsLoading(false)
        }
    }, [vaultPath, activeFolder])

    /**
     * 选择 Vault 目录
     */
    const selectVault = useCallback(async (): Promise<boolean> => {
        try {
            const path = await window.fs.selectDirectory()
            if (path) {
                setVaultPath(path)
                await window.fs.watch(path)
                // 派发 vault 变化事件，通知其他 hooks 重新加载设置
                window.dispatchEvent(new CustomEvent('vault-changed'))
                console.log('📂 Vault 已连接，派发 vault-changed 事件')
                return true
            }
            return false
        } catch (error) {
            console.error('选择目录失败:', error)
            return false
        }
    }, [])

    /**
     * 选择文件夹（退出编辑时检查空文件）
     */
    const selectFolder = useCallback(async (node: FileNode | null) => {
        if (node && !node.isDirectory) return

        // 检查当前文件：只有当内容为空且标题未修改（仍是 Untitled_xxx）时才删除
        // 如果用户已经修改了标题（文件名），则保留文件即使内容为空
        // 注意：如果是新创建的文件（isNewlyCreatedFile），不要立即删除
        if (activeFile && !fileContent.trim() && !isNewlyCreatedFile) {
            const isUntitled = activeFile.name.startsWith('Untitled_')
            if (isUntitled) {
                // 默认标题 + 空内容 = 删除
                try {
                    await window.fs.deleteFile(activeFile.path)
                    console.log('🗑️ 删除空文件:', activeFile.path)
                    await refreshTree()
                } catch (error) {
                    console.error('删除空文件失败:', error)
                }
            } else {
                // 用户已修改标题但内容为空 = 保留文件（只保存）
                console.log('📝 保留标题但内容为空的文件:', activeFile.path)
            }
        } else if (activeFile && fileContent !== lastContentRef.current) {
            // 保存当前文件（如果有修改）
            await window.fs.writeFile(activeFile.path, fileContent)
        }

        setActiveFolder(node)
        setActiveFile(null)

        // 保存状态到 localStorage
        if (node) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH, node.path)
        } else {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH)
        }
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_FILE_PATH)
    }, [activeFile, fileContent, refreshTree, isNewlyCreatedFile])

    /**
     * 判断文件是否可编辑 (.md / .txt)
     */
    const isEditable = useCallback((file: FileNode): boolean => {
        const ext = file.extension?.toLowerCase() || ''
        // 支持带点和不带点的扩展名
        const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`
        return EDITABLE_EXTENSIONS.includes(normalizedExt)
    }, [])

    /**
     * 递归获取所有文件（不包括文件夹）
     */
    const getAllFiles = useCallback((): FileNode[] => {
        const collectFiles = (nodes: FileNode[]): FileNode[] => {
            const files: FileNode[] = []
            for (const node of nodes) {
                if (!node.isDirectory) {
                    files.push(node)
                } else if (node.children) {
                    files.push(...collectFiles(node.children))
                }
            }
            return files
        }
        return collectFiles(fileTree)
    }, [fileTree])

    /**
     * 打开文件
     */
    const openFile = useCallback(async (node: FileNode) => {
        // 如果是文件夹，选中它
        if (node.isDirectory) {
            selectFolder(node)
            return
        }

        // 检查当前文件：如果内容为空且不是新创建的文件，删除该空文件
        // 注意：新创建的文件（isNewlyCreatedFile）不应被删除，给用户编辑机会
        if (activeFile && !fileContent.trim() && !isNewlyCreatedFile) {
            try {
                await window.fs.deleteFile(activeFile.path)
                console.log('🗑️ 删除空文件:', activeFile.path)
            } catch (error) {
                console.error('删除空文件失败:', error)
            }
        } else if (activeFile && fileContent !== lastContentRef.current) {
            // 保存当前文件（如果有修改）
            await window.fs.writeFile(activeFile.path, fileContent)
        }

        try {
            const content = await window.fs.readFile(node.path)
            setActiveFile(node)

            // 保存活动文件路径到 localStorage
            localStorage.setItem(STORAGE_KEYS.ACTIVE_FILE_PATH, node.path)

            // 自动选中文件的父文件夹
            const parentPath = node.path.includes('/')
                ? node.path.substring(0, node.path.lastIndexOf('/'))
                : null

            if (parentPath) {
                const parentNode = findNodeByPath(fileTree, parentPath)
                setActiveFolder(parentNode)
                localStorage.setItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH, parentPath)
            } else {
                // 文件在根目录
                setActiveFolder(null)
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_FOLDER_PATH)
            }

            setFileContent(content)
            lastContentRef.current = content

            // 如果文件有内容，说明不是新创建的，重置标志
            if (content.trim()) {
                setIsNewlyCreatedFile(false)
            }
        } catch (error) {
            console.error('打开文件失败:', error)
        }
    }, [activeFile, fileContent, fileTree, selectFolder, isNewlyCreatedFile])

    /**
     * 保存当前文件
     */
    const saveFile = useCallback(async () => {
        if (!activeFile) return

        try {
            await window.fs.writeFile(activeFile.path, fileContent)
            lastContentRef.current = fileContent
            console.log('💾 文件已保存:', activeFile.path)
        } catch (error) {
            console.error('保存文件失败:', error)
        }
    }, [activeFile, fileContent])

    /**
     * 自动保存（防抖）+ 图片清理
     */
    const handleContentChange = useCallback((content: string) => {
        const oldContent = fileContent
        setFileContent(content)

        // 防抖保存
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
        }

        saveTimerRef.current = setTimeout(async () => {
            if (activeFile && content !== lastContentRef.current) {
                await window.fs.writeFile(activeFile.path, content)
                lastContentRef.current = content
                console.log('💾 自动保存:', activeFile.path)

                // 检测被移除的图片引用并清理孤儿图片
                const oldImages = extractImagePaths(oldContent)
                const newImages = extractImagePaths(content)
                const removedImages = oldImages.filter(img => !newImages.includes(img))

                if (removedImages.length > 0) {
                    console.log('🖼️ 检测到移除的图片引用:', removedImages)
                    // 获取笔记目录路径
                    const fileDir = activeFile.path.includes('/')
                        ? activeFile.path.substring(0, activeFile.path.lastIndexOf('/'))
                        : ''

                    for (const imgPath of removedImages) {
                        // 构建完整的相对路径（相对于 vault）
                        const fullImgPath = fileDir ? `${fileDir}/${imgPath}` : imgPath

                        // 检查图片是否被其他文件引用
                        const isReferenced = await window.fs.isImageReferenced(fullImgPath, activeFile.path)
                        if (!isReferenced) {
                            await window.fs.deleteUnreferencedImage(fullImgPath)
                        }
                    }
                }
            }
        }, 1000)
    }, [activeFile, fileContent])

    /**
     * 创建新文件
     */
    const createNewFile = useCallback(async (name: string, inDirectory?: string) => {
        if (!vaultPath) return

        const dir = inDirectory || activeFolder?.path || ''
        const path = dir ? `${dir}/${name}` : name

        try {
            await window.fs.createFile(path)
            await refreshTree()

            // 标记为新创建的文件
            setIsNewlyCreatedFile(true)

            // 打开新创建的文件
            const ext = name.split('.').pop()
            const newNode: FileNode = {
                name,
                path,
                isDirectory: false,
                extension: ext ? `.${ext}` : undefined  // 添加点号前缀，与 EDITABLE_EXTENSIONS 格式一致
            }
            await openFile(newNode)
        } catch (error) {
            console.error('创建文件失败:', error)
        }
    }, [vaultPath, activeFolder, refreshTree, openFile])

    /**
     * 创建新文件夹（自动检查重名并编号）
     * 返回实际创建的文件夹路径
     */
    const createNewFolder = useCallback(async (name: string, inDirectory?: string): Promise<string | null> => {
        if (!vaultPath) return null

        const dir = inDirectory || activeFolder?.path || ''

        // 获取同级目录下的现有文件夹名称（支持嵌套文件夹）
        let siblings: FileNode[] = []
        if (dir) {
            const parentNode = findNodeByPath(fileTree, dir)
            siblings = parentNode?.children?.filter(c => c.isDirectory) || []
        } else {
            siblings = fileTree.filter(n => n.isDirectory)
        }
        const existingNames = new Set(siblings.map(n => n.name))

        // 自动编号：检查是否重名
        let finalName = name
        let counter = 2
        while (existingNames.has(finalName)) {
            finalName = `${name} ${counter}`
            counter++
        }

        const path = dir ? `${dir}/${finalName}` : finalName

        try {
            await window.fs.createDirectory(path)
            await refreshTree()

            // 选中新创建的文件夹
            const newNode: FileNode = {
                name: finalName,
                path,
                isDirectory: true,
                children: []
            }
            selectFolder(newNode)
            return path
        } catch (error) {
            console.error('创建文件夹失败:', error)
            return null
        }
    }, [vaultPath, activeFolder, fileTree, refreshTree, selectFolder])

    /**
     * 删除文件（同时清理孤儿图片）
     */
    const deleteFile = useCallback(async (path: string) => {
        try {
            // 先读取文件内容获取图片引用
            let imagePathsToCheck: string[] = []
            try {
                const content = await window.fs.readFile(path)
                imagePathsToCheck = extractImagePaths(content)
            } catch {
                // 文件可能已不存在，忽略
            }

            // 删除文件
            await window.fs.deleteFile(path)

            // 立即刷新文件树以显示删除效果
            // 注意：refreshTree 会保持 activeFolder 状态（见第 140-149 行的逻辑）
            await refreshTree()

            // 如果删除的是当前打开的文件，清空编辑器
            if (activeFile?.path === path) {
                setActiveFile(null)
                setFileContent('')
            }

            // 清理孤儿图片
            if (imagePathsToCheck.length > 0) {
                console.log('🖼️ 检查删除笔记后的孤儿图片:', imagePathsToCheck)
                // 获取笔记目录路径
                const fileDir = path.includes('/')
                    ? path.substring(0, path.lastIndexOf('/'))
                    : ''

                for (const imgPath of imagePathsToCheck) {
                    // 构建完整的相对路径（相对于 vault）
                    const fullImgPath = fileDir ? `${fileDir}/${imgPath}` : imgPath

                    // 检查图片是否被其他文件引用（不排除任何文件，因为这个文件已删除）
                    const isReferenced = await window.fs.isImageReferenced(fullImgPath)
                    if (!isReferenced) {
                        await window.fs.deleteUnreferencedImage(fullImgPath)
                    }
                }
            }
        } catch (error) {
            console.error('删除文件失败:', error)
        }
    }, [activeFile, refreshTree])

    /**
     * 重命名文件/文件夹
     */
    const renameItem = useCallback(async (oldPath: string, newName: string) => {
        try {
            // 设置重命名标志，防止文件变化事件清空编辑器
            isRenamingRef.current = true

            // 获取目录路径
            const pathParts = oldPath.split('/')
            pathParts.pop()
            const dir = pathParts.join('/')
            const newPath = dir ? `${dir}/${newName}` : newName

            await window.fs.renameFile(oldPath, newPath)

            // 更新引用
            if (activeFile?.path === oldPath) {
                const ext = newName.split('.').pop()
                setActiveFile({
                    ...activeFile,
                    path: newPath,
                    name: newName,
                    extension: ext ? `.${ext}` : undefined  // 添加点号前缀
                })
            }
            if (activeFolder?.path === oldPath) {
                setActiveFolder({
                    ...activeFolder,
                    path: newPath,
                    name: newName
                })
            }

            // 延迟重置重命名标志，确保文件变化事件处理完成
            setTimeout(() => {
                isRenamingRef.current = false
            }, 500)
        } catch (error) {
            isRenamingRef.current = false
            console.error('重命名失败:', error)
        }
    }, [activeFile, activeFolder])

    /**
     * 移动文件或文件夹到新目录
     * @param sourcePath 源路径
     * @param targetDir 目标目录路径（空字符串表示根目录）
     * @returns 是否成功
     */
    const moveItem = useCallback(async (sourcePath: string, targetDir: string): Promise<boolean> => {
        try {
            // 获取源文件/文件夹的名称
            const name = sourcePath.split('/').pop()
            if (!name) return false

            // 计算新路径
            const newPath = targetDir ? `${targetDir}/${name}` : name

            // 检查是否移动到自身或子目录（防止循环引用）
            if (sourcePath === newPath) return false
            if (newPath.startsWith(sourcePath + '/')) {
                console.error(t('file.moveErrorSubdirectory'))
                return false
            }

            // 检查目标是否已存在同名文件
            const existingItem = findNodeByPath(fileTree, newPath)
            if (existingItem) {
                console.error(t('file.moveErrorDuplicate'))
                return false
            }

            // 执行移动（使用 rename 实现）
            await window.fs.renameFile(sourcePath, newPath)
            await refreshTree()

            // 更新引用
            if (activeFile?.path === sourcePath) {
                setActiveFile({
                    ...activeFile,
                    path: newPath
                })
            }
            if (activeFolder?.path === sourcePath) {
                setActiveFolder({
                    ...activeFolder,
                    path: newPath
                })
            }

            console.log(`✅ 已移动: ${sourcePath} → ${newPath}`)
            return true
        } catch (error) {
            console.error('移动失败:', error)
            return false
        }
    }, [activeFile, activeFolder, fileTree, refreshTree])

    /**
     * 格式转换器
     * - MD → TXT：去除 MD 格式符号，保存为 TXT（覆盖或创建）
     * - TXT → MD：如果同名 MD 存在则打开，否则重命名当前文件
     */
    const convertFileFormat = useCallback(async (smartConversion: boolean = true) => {
        console.log('🔄 格式转换 - smartConversion:', smartConversion)
        if (!activeFile) return

        const currentExt = activeFile.extension?.toLowerCase()?.replace('.', '')

        // 判断当前是 TXT 还是 MD
        const isTxt = currentExt === 'txt'
        const isMd = currentExt === 'md'

        if (!isTxt && !isMd) return

        const baseName = activeFile.name.replace(/\.[^/.]+$/, '')
        const newExt = isTxt ? 'md' : 'txt'
        const newName = `${baseName}.${newExt}`

        // 获取目录路径
        const pathParts = activeFile.path.split('/')
        pathParts.pop()
        const dir = pathParts.join('/')
        const newPath = dir ? `${dir}/${newName}` : newName

        // 检查目标文件是否已存在
        const existingFile = findNodeByPath(fileTree, newPath)

        // 如果文件内容为空，直接重命名当前文件（不创建新文件）
        if (!fileContent.trim()) {
            try {
                await window.fs.renameFile(activeFile.path, newPath)
                await refreshTree()
                const newNode: FileNode = {
                    name: newName,
                    path: newPath,
                    isDirectory: false,
                    extension: `.${newExt}`
                }
                await openFile(newNode)
            } catch (error) {
                console.error('格式转换失败:', error)
            }
            return
        }

        // ========== TXT → MD ==========
        if (isTxt) {
            if (existingFile) {
                // 目标 MD 已存在，直接打开
                await openFile(existingFile)
            } else {
                // 目标 MD 不存在，重命名当前文件（内容不变）
                try {
                    await window.fs.writeFile(activeFile.path, fileContent) // 先保存当前内容
                    await window.fs.renameFile(activeFile.path, newPath)
                    await refreshTree()

                    const newNode: FileNode = {
                        name: newName,
                        path: newPath,
                        isDirectory: false,
                        extension: `.${newExt}`
                    }
                    await openFile(newNode)
                } catch (error) {
                    console.error('格式转换失败:', error)
                }
            }
            return
        }

        // ========== MD → TXT ==========
        // 根据 smartConversion 参数决定是否去除 MD 格式符号
        let convertedContent = fileContent

        // 智能转换：去除 MD 格式符号
        if (smartConversion) {
            // 1. 处理代码块（支持 ```, ````, 等多个反引号）
            // 先移除四反引号代码块
            convertedContent = convertedContent.replace(/````\w*\n([\s\S]*?)````/g, '$1')
            // 再移除三反引号代码块
            convertedContent = convertedContent.replace(/```\w*\n([\s\S]*?)```/g, '$1')

            // 2. 处理表格 - 转换为制表符分隔的格式
            convertedContent = convertedContent.replace(/^\|(.+)\|$/gm, (line) => {
                // 跳过分隔行（只包含 -, :, |, 空格）
                if (/^[\s|:\-]+$/.test(line)) return ''
                // 提取单元格内容
                return line
                    .split('|')
                    .filter(cell => cell.trim())
                    .map(cell => cell.trim())
                    .join('\t')
            })

            // 3. 处理各种格式标记（按顺序处理，避免冲突）
            convertedContent = convertedContent
                // 处理水平分隔线（单独一行的 --- 或 *** 或 ___）
                .replace(/^\s*[-*_]{3,}\s*$/gm, '')
                // 移除标题标记（保留内容）
                .replace(/^#{1,6}\s+/gm, '')
                // 处理图片 ![alt](url) 或 ![alt](url "title") → 移除
                .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
                // 处理链接 [文字](链接) → 文字
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                // 处理粗体斜体组合 ***text*** 或 ___text___
                .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
                .replace(/___([^_]+)___/g, '$1')
                // 处理粗体 **text** 或 __text__
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/__([^_]+)__/g, '$1')
                // 处理斜体 *text* 或 _text_ (需要小心不匹配 ** 或 __)
                .replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, '$1')
                .replace(/(?<![_])_([^_\n]+)_(?![_])/g, '$1')
                // 处理删除线 ~~text~~
                .replace(/~~([^~]+)~~/g, '$1')
                // 处理行内代码 `code` (包括空的反引号)
                .replace(/`+([^`]*)`+/g, '$1')
                // 处理引用标记 > text（每行开头）
                .replace(/^>\s?/gm, '')
                // 处理无序列表标记（保留缩进）- 修复：匹配行首空格后的 */-/+
                .replace(/^(\s*)[\-\*\+]\s+/gm, '$1')
                // 处理有序列表标记（保留缩进）
                .replace(/^(\s*)\d+\.\s+/gm, '$1')
                // 处理任务列表 - [ ] 或 - [x]
                .replace(/^(\s*)[\-\*]\s*\[[ xX]\]\s*/gm, '$1')
                // 处理转义字符 \* \_ \` \\ 等（还原为原始字符）
                .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1')
                // 清理 LaTeX 公式块 (保留公式内容但移除 $$)
                .replace(/\$\$([^$]+)\$\$/g, '$1')
                // 保留行内公式的 $ 作为数学符号
                // 清理 HTML 注释
                .replace(/<!--[\s\S]*?-->/g, '')
                // 清理可能残留的 HTML 标签
                .replace(/<[^>]+>/g, '')

            // 4. 最后清理
            convertedContent = convertedContent
                // 清理行首的全角空格（首行缩进）后面紧跟的多余空格
                .replace(/^(　+)\s+/gm, '$1')
                // 清理每行末尾的空格
                .replace(/[ \t]+$/gm, '')
                // 合并多个连续空行为最多两个
                .replace(/\n{3,}/g, '\n\n')
                .trim()
        }
        // 如果 smartConversion 为 false，convertedContent 保持为 fileContent 不变

        try {
            if (existingFile) {
                // 目标 TXT 已存在，直接打开（不创建新版本）
                await openFile(existingFile)
            } else {
                // 目标 TXT 不存在，创建新文件
                await window.fs.createFile(newPath)
                await window.fs.writeFile(newPath, convertedContent)
                await refreshTree()

                const newNode: FileNode = {
                    name: newName,
                    path: newPath,
                    isDirectory: false,
                    extension: `.${newExt}`
                }
                await openFile(newNode)
            }
        } catch (error) {
            console.error('格式转换失败:', error)
        }
    }, [activeFile, fileContent, fileTree, refreshTree, openFile])

    /**
     * 导出当前 Markdown 文件为 PDF
     * 保存到源文件同目录下，文件名相同
     */
    const exportToPdf = useCallback(async (): Promise<{ success: boolean, error?: string }> => {
        if (!activeFile) {
            return { success: false, error: t('export.noActiveFile') }
        }

        const ext = activeFile.extension?.toLowerCase()
        if (ext !== '.md') {
            return { success: false, error: t('export.onlyMarkdownSupported') }
        }

        try {
            // 1. 使用 marked 将 Markdown 转换为 HTML
            const { marked } = await import('marked')
            const htmlContent = await marked.parse(fileContent)

            // 2. 计算输出路径（同目录，同名 .pdf）
            const baseName = activeFile.name.replace(/\.md$/i, '')
            const dir = activeFile.path.includes('/')
                ? activeFile.path.substring(0, activeFile.path.lastIndexOf('/'))
                : ''
            const outputPath = dir ? `${dir}/${baseName}.pdf` : `${baseName}.pdf`

            // 3. 调用 Electron 导出
            const result = await window.fs.exportMarkdownToPdf(
                htmlContent,
                outputPath,
                baseName
            )

            if (result.success) {
                // 刷新文件树以显示新的 PDF 文件
                await refreshTree()
            }

            return result
        } catch (error) {
            console.error('导出 PDF 失败:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : t('export.exportFailed')
            }
        }
    }, [activeFile, fileContent, refreshTree])

    return {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        previewFile,
        fileContent,
        isLoading,
        isNewlyCreatedFile,
        selectVault,
        refreshTree,
        openFile,
        selectFolder,
        setPreviewFile,
        isEditable,
        getAllFiles,
        saveFile,
        setFileContent: handleContentChange,
        createNewFile,
        createNewFolder,
        deleteFile,
        renameItem,
        convertFileFormat,
        moveItem,
        exportToPdf
    }
}

export default useFileSystem
