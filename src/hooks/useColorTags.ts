/**
 * 颜色标签系统
 * 使用相对路径存储 (fs API 会自动添加 vaultPath)
 */

import { useState, useEffect, useCallback } from 'react'

// 颜色定义
export const TAG_COLORS = {
    none: { name: '无', border: 'border-white/10', bg: 'bg-white/5', icon: '' },
    red: { name: '红色', border: 'border-red-400', bg: 'bg-red-500/5', icon: 'text-red-400' },
    orange: { name: '橙色', border: 'border-orange-400', bg: 'bg-orange-500/5', icon: 'text-orange-400' },
    yellow: { name: '黄色', border: 'border-yellow-400', bg: 'bg-yellow-500/5', icon: 'text-yellow-400' },
    green: { name: '绿色', border: 'border-green-400', bg: 'bg-green-500/5', icon: 'text-green-400' },
    blue: { name: '蓝色', border: 'border-blue-400', bg: 'bg-blue-500/5', icon: 'text-blue-400' },
    purple: { name: '紫色', border: 'border-purple-400', bg: 'bg-purple-500/5', icon: 'text-purple-400' },
    gray: { name: '灰色', border: 'border-gray-400', bg: 'bg-gray-500/5', icon: 'text-gray-400' },
} as const

export type TagColor = keyof typeof TAG_COLORS

interface ColorTagsState {
    [path: string]: TagColor
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
                            // 使用相对路径
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
                // 使用相对路径
                await window.fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2))
            }
        } catch (error) {
            console.error('保存颜色标签失败:', error)
        }
    }, [])

    // 设置颜色标签
    const setColorTag = useCallback((path: string, color: TagColor) => {
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
    const getColorTag = useCallback((path: string): TagColor => {
        return colorTags[path] || 'none'
    }, [colorTags])

    // 获取颜色样式
    const getColorStyles = useCallback((path: string) => {
        const color = getColorTag(path)
        return TAG_COLORS[color]
    }, [getColorTag])

    return {
        colorTags,
        isLoaded,
        setColorTag,
        getColorTag,
        getColorStyles,
    }
}

export default useColorTags
