/**
 * 颜色标签系统
 * 使用 .zennote/color_tags.json 存储到用户文件夹
 * 统一颜色定义，使用 FileTree 的 ColorKey 类型
 */

import { useState, useEffect, useCallback } from 'react'
import type { ColorKey } from '../components/FileTree'

// 重新导出 ColorKey 类型方便使用
export type { ColorKey } from '../components/FileTree'

// 颜色配置 - 红黄绿蓝（与 FileTree.tsx 保持一致）
export const TAG_COLORS: { key: ColorKey; hex: string; name: string }[] = [
    { key: 'none', hex: 'transparent', name: '无' },
    { key: 'red', hex: '#ff453a', name: '红' },
    { key: 'yellow', hex: '#ffcc00', name: '黄' },
    { key: 'green', hex: '#30d158', name: '绿' },
    { key: 'blue', hex: '#007aff', name: '蓝' },
]

interface ColorTagsState {
    [path: string]: ColorKey
}

// 相对路径 (fs API 会自动加上 vaultPath)
const TAGS_FILE = '.zennote/color_tags.json'

export function useColorTags() {
    const [colorTags, setColorTags] = useState<ColorTagsState>({})
    const [isLoaded, setIsLoaded] = useState(false)

    // 加载颜色标签
    useEffect(() => {
        const loadTags = async () => {
            try {
                if (window.fs) {
                    const vaultPath = await window.fs.getVaultPath()
                    if (vaultPath) {
                        try {
                            const content = await window.fs.readFile(TAGS_FILE)
                            setColorTags(JSON.parse(content))
                        } catch {
                            // 文件不存在，使用空对象
                            setColorTags({})
                        }
                    }
                }
            } catch (error) {
                console.error('加载颜色标签失败:', error)
                setColorTags({})
            }
            setIsLoaded(true)
        }
        loadTags()
    }, [])

    // 保存颜色标签
    const saveTags = useCallback(async (tags: ColorTagsState) => {
        try {
            if (window.fs) {
                await window.fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2))
            }
        } catch (error) {
            console.error('保存颜色标签失败:', error)
        }
    }, [])

    // 设置颜色标签
    const setColorTag = useCallback((path: string, color: ColorKey) => {
        setColorTags(prev => {
            const newTags = { ...prev }
            if (color === 'none') {
                delete newTags[path]
            } else {
                newTags[path] = color
            }
            saveTags(newTags)
            return newTags
        })
    }, [saveTags])

    // 获取颜色标签
    const getColorTag = useCallback((path: string): ColorKey => {
        return colorTags[path] || 'none'
    }, [colorTags])

    // 获取颜色 hex 值
    const getColorHex = useCallback((path: string): string => {
        const color = getColorTag(path)
        return TAG_COLORS.find(c => c.key === color)?.hex || 'transparent'
    }, [getColorTag])

    return {
        colorTags,
        isLoaded,
        setColorTag,
        getColorTag,
        getColorHex,
    }
}

export default useColorTags
