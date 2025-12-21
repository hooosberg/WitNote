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
    createdAt?: number   // 创建时间戳（毫秒）
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
    isNewlyCreatedFile: boolean  // 新创建的文件标志

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
    convertFileFormat: (smartConversion?: boolean) => Promise<void>
    moveItem: (sourcePath: string, targetDir: string) => Promise<boolean>  // 移动文件/文件夹
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
    const [isNewlyCreatedFile, setIsNewlyCreatedFile] = useState(false)

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
        if (activeFile && !fileContent.trim()) {
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

            // 如果文件有内容，说明不是新创建的，重置标志
            if (content.trim()) {
                setIsNewlyCreatedFile(false)
            }
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

            // 标记为新创建的文件
            setIsNewlyCreatedFile(true)

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

            // 立即刷新文件树以显示删除效果
            // 注意：refreshTree 会保持 activeFolder 状态（见第 140-149 行的逻辑）
            await refreshTree()

            // 如果删除的是当前打开的文件，清空编辑器
            if (activeFile?.path === path) {
                setActiveFile(null)
                setFileContent('')
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
                console.error('不能将文件夹移动到其子目录中')
                return false
            }

            // 检查目标是否已存在同名文件
            const existingItem = findNodeByPath(fileTree, newPath)
            if (existingItem) {
                console.error('目标位置已存在同名文件或文件夹')
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
                // 目标 TXT 已存在
                // 检查 MD 是否有修改（与 TXT 内容比较）
                const existingTxtContent = await window.fs.readFile(existingFile.path)

                // 如果转换后的内容与现有 TXT 相同，说明 MD 没有实质性修改，直接打开
                if (convertedContent === existingTxtContent.trim()) {
                    await openFile(existingFile)
                } else {
                    // MD 有修改，创建带编号的新 TXT 文件
                    let counter = 2
                    let numberedName = `${baseName}_${counter}.txt`
                    let numberedPath = dir ? `${dir}/${numberedName}` : numberedName

                    // 查找可用的编号
                    while (findNodeByPath(fileTree, numberedPath)) {
                        counter++
                        numberedName = `${baseName}_${counter}.txt`
                        numberedPath = dir ? `${dir}/${numberedName}` : numberedName
                    }

                    await window.fs.createFile(numberedPath)
                    await window.fs.writeFile(numberedPath, convertedContent)
                    await refreshTree()

                    const newNode: FileNode = {
                        name: numberedName,
                        path: numberedPath,
                        isDirectory: false,
                        extension: 'txt'
                    }
                    await openFile(newNode)
                }
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
        isNewlyCreatedFile,
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
        convertFileFormat,
        moveItem
    }
}

export default useFileSystem
