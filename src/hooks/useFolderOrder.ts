/**
 * 文件夹排序存储
 * 使用相对路径存储 (fs API 会自动添加 vaultPath)
 */

import { useState, useEffect, useCallback } from 'react'

// 存储文件路径
const ORDER_FILE = '.zennote/folder_order.json'

// 排序数据：父路径 -> 子项路径数组（按顺序）
interface FolderOrderState {
    [parentPath: string]: string[]
}

export function useFolderOrder() {
    const [folderOrder, setFolderOrder] = useState<FolderOrderState>({})
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
                            setFolderOrder(JSON.parse(content))
                        } catch {
                            // 文件不存在，使用空对象
                            setFolderOrder({})
                        }
                    }
                }
            } catch (error) {
                console.error('加载排序数据失败:', error)
                setFolderOrder({})
            }
            setIsLoaded(true)
        }
        loadOrder()
    }, [])

    // 保存排序数据
    const saveOrder = useCallback(async (order: FolderOrderState) => {
        try {
            if (window.fs) {
                await window.fs.writeFile(ORDER_FILE, JSON.stringify(order, null, 2))
            }
        } catch (error) {
            console.error('保存排序数据失败:', error)
        }
    }, [])

    // 设置排序（针对特定父目录）
    const setOrder = useCallback((parentPath: string, orderedPaths: string[]) => {
        setFolderOrder(prev => {
            const newOrder = { ...prev, [parentPath]: orderedPaths }
            saveOrder(newOrder)
            return newOrder
        })
    }, [saveOrder])

    // 获取排序数组
    const getOrder = useCallback((parentPath: string): string[] => {
        return folderOrder[parentPath] || []
    }, [folderOrder])

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

    return {
        folderOrder,
        isLoaded,
        setOrder,
        getOrder,
        applyOrder,
    }
}
