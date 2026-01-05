/**
 * 文件夹排序和图钉存储
 * 使用相对路径存储 (fs API 会自动添加 vaultPath)
 */

import { useState, useEffect, useCallback } from 'react'

// 存储文件路径
const ORDER_FILE = '.zennote/folder_order.json'

// 排序数据：父路径 -> 子项路径数组（按顺序）
interface FolderOrderState {
    [parentPath: string]: string[]
}

// 存储结构
interface StorageData {
    folderOrder: FolderOrderState
    pinnedFiles: string[]  // 固定的文件路径列表
    expandedFolders: string[]  // 展开的文件夹路径列表
}

export function useFolderOrder() {
    const [folderOrder, setFolderOrder] = useState<FolderOrderState>({})
    const [pinnedFiles, setPinnedFiles] = useState<string[]>([])
    const [expandedFolders, setExpandedFolders] = useState<string[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // 加载排序数据
    useEffect(() => {
        const loadOrder = async () => {
            try {
                if (window.fs) {
                    const vaultPath = await window.fs.getVaultPath()
                    if (vaultPath) {
                        try {
                            const content = await window.fs.readFile(ORDER_FILE)
                            const data = JSON.parse(content)
                            // 兼容旧格式
                            if (data.folderOrder) {
                                setFolderOrder(data.folderOrder)
                                setPinnedFiles(data.pinnedFiles || [])
                                setExpandedFolders(data.expandedFolders || [])
                            } else {
                                // 旧格式：直接是 folderOrder 对象
                                setFolderOrder(data)
                                setPinnedFiles([])
                                setExpandedFolders([])
                            }
                        } catch {
                            // 文件不存在，使用空对象
                            setFolderOrder({})
                            setPinnedFiles([])
                            setExpandedFolders([])
                        }
                    }
                }
            } catch (error) {
                console.error('加载排序数据失败:', error)
                setFolderOrder({})
                setPinnedFiles([])
                setExpandedFolders([])
            }
            setIsLoaded(true)
        }
        loadOrder()
    }, [])

    // 保存排序数据
    const saveData = useCallback(async (order: FolderOrderState, pinned: string[], expanded: string[]) => {
        try {
            if (window.fs) {
                const data: StorageData = {
                    folderOrder: order,
                    pinnedFiles: pinned,
                    expandedFolders: expanded
                }
                await window.fs.writeFile(ORDER_FILE, JSON.stringify(data, null, 2))
            }
        } catch (error) {
            console.error('保存排序数据失败:', error)
        }
    }, [])

    // 设置排序（针对特定父目录）
    const setOrder = useCallback((parentPath: string, orderedPaths: string[]) => {
        setFolderOrder(prev => {
            const newOrder = { ...prev, [parentPath]: orderedPaths }
            saveData(newOrder, pinnedFiles, expandedFolders)
            return newOrder
        })
    }, [saveData, pinnedFiles, expandedFolders])

    // 获取排序数组
    const getOrder = useCallback((parentPath: string): string[] => {
        return folderOrder[parentPath] || []
    }, [folderOrder])

    // 切换图钉状态
    const togglePin = useCallback((filePath: string) => {
        setPinnedFiles(prev => {
            const newPinned = prev.includes(filePath)
                ? prev.filter(p => p !== filePath)
                : [...prev, filePath]
            saveData(folderOrder, newPinned, expandedFolders)
            console.log('📌 图钉切换:', filePath, newPinned.includes(filePath) ? '固定' : '取消固定')
            return newPinned
        })
    }, [saveData, folderOrder, expandedFolders])

    // 检查是否固定
    const isPinned = useCallback((filePath: string): boolean => {
        return pinnedFiles.includes(filePath)
    }, [pinnedFiles])

    // 对节点数组应用排序
    const applyOrder = useCallback(<T extends { path: string }>(parentPath: string, items: T[]): T[] => {
        const order = folderOrder[parentPath]
        if (!order || order.length === 0) {
            return items
        }

        // 根据保存的顺序排序
        return [...items].sort((a, b) => {
            const indexA = order.indexOf(a.path)
            const indexB = order.indexOf(b.path)

            // 不在列表中的放到最后
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1

            return indexA - indexB
        })
    }, [folderOrder])

    // 更新图钉路径（当文件移动时调用）
    const updatePinnedPath = useCallback((oldPath: string, newPath: string) => {
        setPinnedFiles(prev => {
            const index = prev.indexOf(oldPath)
            if (index !== -1) {
                const newPinned = [...prev]
                newPinned[index] = newPath
                saveData(folderOrder, newPinned, expandedFolders)
                console.log('📌 图钉路径更新:', oldPath, '→', newPath)
                return newPinned
            }
            return prev
        })
    }, [saveData, folderOrder, expandedFolders])

    // 更新排序列表中的路径（当文件移动时调用）
    const updateOrderPath = useCallback((oldPath: string, newPath: string, oldParentKey: string, newParentKey: string) => {
        setFolderOrder(prev => {
            const newOrder = { ...prev }

            // 从旧父目录移除
            if (newOrder[oldParentKey]) {
                newOrder[oldParentKey] = newOrder[oldParentKey].filter(p => p !== oldPath)
            }

            // 添加到新父目录
            if (!newOrder[newParentKey]) {
                newOrder[newParentKey] = []
            }
            if (!newOrder[newParentKey].includes(newPath)) {
                newOrder[newParentKey].unshift(newPath)  // 添加到开头
            }

            saveData(newOrder, pinnedFiles, expandedFolders)
            console.log('📂 排序路径更新:', oldPath, '→', newPath)
            return newOrder
        })
    }, [saveData, pinnedFiles, expandedFolders])

    // 检查文件夹是否展开
    const isExpanded = useCallback((folderPath: string): boolean => {
        return expandedFolders.includes(folderPath)
    }, [expandedFolders])

    // 切换文件夹展开状态
    const toggleExpanded = useCallback((folderPath: string) => {
        setExpandedFolders(prev => {
            const newExpanded = prev.includes(folderPath)
                ? prev.filter(p => p !== folderPath)
                : [...prev, folderPath]
            saveData(folderOrder, pinnedFiles, newExpanded)
            return newExpanded
        })
    }, [saveData, folderOrder, pinnedFiles])

    return {
        folderOrder,
        pinnedFiles,
        expandedFolders,
        isLoaded,
        setOrder,
        getOrder,
        applyOrder,
        togglePin,
        isPinned,
        updatePinnedPath,
        updateOrderPath,
        isExpanded,
        toggleExpanded,
    }
}
