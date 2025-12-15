/**
 * useFileSystem Hook
 * 管理文件系统操作、文件树和实时监听
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// 文件节点类型
export interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    extension?: string
    modifiedAt?: number  // 修改时间戳（毫秒）
}

// 文件变化事件
interface FileChangeEvent {
    type: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'
    path: string
}

// Hook 返回类型
export interface UseFileSystemReturn {
    // 状态
    vaultPath: string | null
    isInitialized: boolean
    fileTree: FileNode[]
    activeFile: FileNode | null
    activeFolder: FileNode | null
    fileContent: string
    isLoading: boolean

    // 方法
    selectVault: () => Promise<boolean>
    refreshTree: () => Promise<void>
    openFile: (node: FileNode) => Promise<void>
    selectFolder: (node: FileNode | null) => void
    getAllFiles: () => FileNode[]  // 递归获取所有文件
    saveFile: () => Promise<void>
    setFileContent: (content: string) => void
    createNewFile: (name: string, inDirectory?: string) => Promise<void>
    createNewFolder: (name: string, inDirectory?: string) => Promise<string | null>
    deleteFile: (path: string) => Promise<void>
    renameItem: (oldPath: string, newName: string) => Promise<void>
    convertFileFormat: () => Promise<void>
}

export function useFileSystem(): UseFileSystemReturn {
    // Vault 状态
    const [vaultPath, setVaultPath] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // 文件树状态
    const [fileTree, setFileTree] = useState<FileNode[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // 当前文件/文件夹状态
    const [activeFile, setActiveFile] = useState<FileNode | null>(null)
    const [activeFolder, setActiveFolder] = useState<FileNode | null>(null)
    const [fileContent, setFileContent] = useState('')

    // 防抖保存定时器
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastContentRef = useRef<string>('')

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
            if (event.type === 'unlink' && activeFile?.path === event.path) {
                setActiveFile(null)
                setFileContent('')
            }
        })

        return cleanup
    }, [vaultPath, activeFile])

    /**
     * Vault 路径变化时刷新文件树
     */
    useEffect(() => {
        if (vaultPath) {
            refreshTree()
        }
    }, [vaultPath])

    /**
     * 刷新文件树
     */
    const refreshTree = useCallback(async () => {
        if (!vaultPath) return

        setIsLoading(true)
        try {
            const tree = await window.fs.readDirectory()
            setFileTree(tree)
        } catch (error) {
            console.error('刷新文件树失败:', error)
        } finally {
            setIsLoading(false)
        }
    }, [vaultPath])

    /**
     * 选择 Vault 目录
     */
    const selectVault = useCallback(async (): Promise<boolean> => {
        try {
            const path = await window.fs.selectDirectory()
            if (path) {
                setVaultPath(path)
                await window.fs.watch(path)
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

        // 检查当前文件：如果内容为空，删除该空文件（新建后未编辑）
        if (activeFile && !fileContent.trim()) {
            try {
                await window.fs.deleteFile(activeFile.path)
                console.log('🗑️ 删除空文件:', activeFile.path)
                await refreshTree()
            } catch (error) {
                console.error('删除空文件失败:', error)
            }
        } else if (activeFile && fileContent !== lastContentRef.current) {
            // 保存当前文件（如果有修改）
            await window.fs.writeFile(activeFile.path, fileContent)
        }

        setActiveFolder(node)
        setActiveFile(null)
    }, [activeFile, fileContent, refreshTree])

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

        // 检查当前文件：如果内容为空，删除该空文件（新建后未编辑）
        if (activeFile && !fileContent.trim()) {
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

            // 自动选中文件的父文件夹
            const parentPath = node.path.includes('/')
                ? node.path.substring(0, node.path.lastIndexOf('/'))
                : null

            if (parentPath) {
                const parentNode = findNodeByPath(fileTree, parentPath)
                setActiveFolder(parentNode)
            } else {
                // 文件在根目录
                setActiveFolder(null)
            }

            setFileContent(content)
            lastContentRef.current = content
        } catch (error) {
            console.error('打开文件失败:', error)
        }
    }, [activeFile, fileContent, fileTree, selectFolder])

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
     * 自动保存（防抖）
     */
    const handleContentChange = useCallback((content: string) => {
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
            }
        }, 1000)
    }, [activeFile])

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

            // 打开新创建的文件
            const newNode: FileNode = {
                name,
                path,
                isDirectory: false,
                extension: name.split('.').pop()
            }
            await openFile(newNode)
        } catch (error) {
            console.error('创建文件失败:', error)
        }
    }, [vaultPath, activeFolder, refreshTree, openFile])

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
     * 删除文件
     */
    const deleteFile = useCallback(async (path: string) => {
        try {
            await window.fs.deleteFile(path)
        } catch (error) {
            console.error('删除文件失败:', error)
        }
    }, [])

    /**
     * 重命名文件/文件夹
     * 如果是 TXT/MD 文件，同时重命名配对的 MD/TXT 文件
     */
    const renameItem = useCallback(async (oldPath: string, newName: string) => {
        try {
            // 获取目录路径
            const pathParts = oldPath.split('/')
            const oldFileName = pathParts.pop() || ''
            const dir = pathParts.join('/')
            const newPath = dir ? `${dir}/${newName}` : newName

            await window.fs.renameFile(oldPath, newPath)

            // 检查是否是 TXT/MD 文件，如果是则同步重命名配对文件
            const oldExt = oldFileName.split('.').pop()?.toLowerCase()
            const newExt = newName.split('.').pop()?.toLowerCase()
            const oldBaseName = oldFileName.replace(/\.[^/.]+$/, '')
            const newBaseName = newName.replace(/\.[^/.]+$/, '')

            if ((oldExt === 'txt' || oldExt === 'md') && oldBaseName !== newBaseName) {
                // 查找配对文件
                const pairExt = oldExt === 'txt' ? 'md' : 'txt'
                const pairOldName = `${oldBaseName}.${pairExt}`
                const pairNewName = `${newBaseName}.${pairExt}`
                const pairOldPath = dir ? `${dir}/${pairOldName}` : pairOldName
                const pairNewPath = dir ? `${dir}/${pairNewName}` : pairNewName

                // 检查配对文件是否存在
                const pairFile = findNodeByPath(fileTree, pairOldPath)
                if (pairFile) {
                    try {
                        await window.fs.renameFile(pairOldPath, pairNewPath)
                        console.log(`📝 同步重命名配对文件: ${pairOldName} → ${pairNewName}`)
                    } catch (e) {
                        console.error('重命名配对文件失败:', e)
                    }
                }
            }

            // 更新引用
            if (activeFile?.path === oldPath) {
                setActiveFile({
                    ...activeFile,
                    path: newPath,
                    name: newName,
                    extension: newName.split('.').pop()
                })
            }
            if (activeFolder?.path === oldPath) {
                setActiveFolder({
                    ...activeFolder,
                    path: newPath,
                    name: newName
                })
            }
        } catch (error) {
            console.error('重命名失败:', error)
        }
    }, [activeFile, activeFolder, fileTree])

    /**
     * 格式转换器
     * - MD → TXT：去除 MD 格式符号，保存为 TXT（覆盖或创建）
     * - TXT → MD：如果同名 MD 存在则打开，否则重命名当前文件
     */
    const convertFileFormat = useCallback(async () => {
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
                    extension: newExt
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
                        extension: newExt
                    }
                    await openFile(newNode)
                } catch (error) {
                    console.error('格式转换失败:', error)
                }
            }
            return
        }

        // ========== MD → TXT ==========
        // 总是去除 MD 格式符号
        const convertedContent = fileContent
            // 移除代码块（先处理多行代码块）
            .replace(/```[\s\S]*?```/g, (match) => {
                // 提取代码块内容（去掉首尾的 ``` 和语言标识）
                const lines = match.split('\n')
                lines.shift() // 移除开头的 ```language
                lines.pop()   // 移除结尾的 ```
                return lines.join('\n')
            })
            // 移除标题标记
            .replace(/^#{1,6}\s+/gm, '')
            // 移除加粗
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/__(.+?)__/g, '$1')
            // 移除斜体
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/_(.+?)_/g, '$1')
            // 移除删除线
            .replace(/~~(.+?)~~/g, '$1')
            // 移除行内代码
            .replace(/`(.+?)`/g, '$1')
            // 移除链接，保留文字
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            // 移除图片
            .replace(/!\[.*?\]\(.+?\)/g, '')
            // 移除引用标记
            .replace(/^>\s*/gm, '')
            // 移除无序列表标记
            .replace(/^[-*+]\s+/gm, '')
            // 移除有序列表标记
            .replace(/^\d+\.\s+/gm, '')
            // 移除任务列表标记
            .replace(/^-\s*\[[ x]\]\s*/gm, '')
            // 移除水平线
            .replace(/^[-*_]{3,}\s*$/gm, '')
            // 清理多余空行（最多保留两个连续空行）
            .replace(/\n{3,}/g, '\n\n')
            .trim()

        try {
            if (existingFile) {
                // 目标 TXT 已存在，覆盖它
                await window.fs.writeFile(newPath, convertedContent)
                await refreshTree()
                await openFile({
                    ...existingFile,
                    extension: 'txt'
                })
            } else {
                // 目标 TXT 不存在，创建新文件
                await window.fs.createFile(newPath)
                await window.fs.writeFile(newPath, convertedContent)
                await refreshTree()

                const newNode: FileNode = {
                    name: newName,
                    path: newPath,
                    isDirectory: false,
                    extension: newExt
                }
                await openFile(newNode)
            }
        } catch (error) {
            console.error('格式转换失败:', error)
        }
    }, [activeFile, fileContent, fileTree, refreshTree, openFile])

    return {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        fileContent,
        isLoading,
        selectVault,
        refreshTree,
        openFile,
        selectFolder,
        getAllFiles,
        saveFile,
        setFileContent: handleContentChange,
        createNewFile,
        createNewFolder,
        deleteFile,
        renameItem,
        convertFileFormat
    }
}

export default useFileSystem
