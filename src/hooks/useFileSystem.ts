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
    saveFile: () => Promise<void>
    setFileContent: (content: string) => void
    createNewFile: (name: string, inDirectory?: string) => Promise<void>
    createNewFolder: (name: string, inDirectory?: string) => Promise<void>
    deleteFile: (path: string) => Promise<void>
    renameItem: (oldPath: string, newName: string) => Promise<void>
    toggleFileFormat: () => Promise<void>
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
     * 选择文件夹
     */
    const selectFolder = useCallback((node: FileNode | null) => {
        if (node && !node.isDirectory) return
        setActiveFolder(node)
        setActiveFile(null)
        setFileContent('')
    }, [])

    /**
     * 打开文件
     */
    const openFile = useCallback(async (node: FileNode) => {
        if (node.isDirectory) {
            // 如果是文件夹，选中它
            selectFolder(node)
            return
        }

        // 保存当前文件（如果有修改）
        if (activeFile && fileContent !== lastContentRef.current) {
            await window.fs.writeFile(activeFile.path, fileContent)
        }

        try {
            const content = await window.fs.readFile(node.path)
            setActiveFile(node)
            setActiveFolder(null)
            setFileContent(content)
            lastContentRef.current = content
        } catch (error) {
            console.error('打开文件失败:', error)
        }
    }, [activeFile, fileContent, selectFolder])

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
     * 创建新文件夹
     */
    const createNewFolder = useCallback(async (name: string, inDirectory?: string) => {
        if (!vaultPath) return

        const dir = inDirectory || activeFolder?.path || ''
        const path = dir ? `${dir}/${name}` : name

        try {
            await window.fs.createDirectory(path)
            await refreshTree()

            // 选中新创建的文件夹
            const newNode: FileNode = {
                name,
                path,
                isDirectory: true,
                children: []
            }
            selectFolder(newNode)
        } catch (error) {
            console.error('创建文件夹失败:', error)
        }
    }, [vaultPath, activeFolder, refreshTree, selectFolder])

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
     */
    const renameItem = useCallback(async (oldPath: string, newName: string) => {
        try {
            // 获取目录路径
            const pathParts = oldPath.split('/')
            pathParts.pop()
            const dir = pathParts.join('/')
            const newPath = dir ? `${dir}/${newName}` : newName

            await window.fs.renameFile(oldPath, newPath)

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
    }, [activeFile, activeFolder])

    /**
     * 切换文件格式 (.txt <-> .md)
     */
    const toggleFileFormat = useCallback(async () => {
        if (!activeFile) return

        const currentExt = activeFile.extension?.toLowerCase()
        let newExt: string

        if (currentExt === '.txt' || currentExt === 'txt') {
            newExt = 'md'
        } else if (currentExt === '.md' || currentExt === 'md') {
            newExt = 'txt'
        } else {
            return
        }

        const baseName = activeFile.name.replace(/\.[^/.]+$/, '')
        const newName = `${baseName}.${newExt}`
        await renameItem(activeFile.path, newName)
    }, [activeFile, renameItem])

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
        saveFile,
        setFileContent: handleContentChange,
        createNewFile,
        createNewFolder,
        deleteFile,
        renameItem,
        toggleFileFormat
    }
}

export default useFileSystem
