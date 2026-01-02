/**
 * 空白行加号菜单组件
 * 光标在空白行时显示加号按钮，点击展开插入菜单
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Image, Minus, Code, Braces, MoreHorizontal, Heading1, Heading2, Quote, List, ListOrdered } from 'lucide-react'
import getCaretCoordinates from 'textarea-caret'

interface BlockInsertMenuProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>
    content: string
    onChange: (content: string) => void
    editorScrollRef: React.RefObject<HTMLDivElement>
    isMarkdown: boolean
    filePath?: string  // 当前文件路径，用于图片保存
}

interface MenuPosition {
    top: number
    left: number
}

// 主菜单项（图片特殊处理）
const mainMenuItems = [
    { id: 'image', icon: Image, label: '图片', insert: '', isSpecial: true },
    { id: 'divider', icon: Minus, label: '分隔线', insert: '\n---\n' },
    { id: 'code', icon: Code, label: '代码块', insert: '\n```\n代码\n```\n' },
    { id: 'inline-code', icon: Braces, label: '行内代码', insert: '`代码`' },
]

// 更多菜单项
const moreMenuItems = [
    { id: 'h1', icon: Heading1, label: '一级标题', insert: '# ' },
    { id: 'h2', icon: Heading2, label: '二级标题', insert: '## ' },
    { id: 'quote', icon: Quote, label: '引用', insert: '> ' },
    { id: 'ul', icon: List, label: '无序列表', insert: '- ' },
    { id: 'ol', icon: ListOrdered, label: '有序列表', insert: '1. ' },
]

export const BlockInsertMenu: React.FC<BlockInsertMenuProps> = ({
    textareaRef,
    content,
    onChange,
    editorScrollRef,
    isMarkdown,
    filePath
}) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [showMore, setShowMore] = useState(false)
    const [showMoreAbove, setShowMoreAbove] = useState(false)  // 菜单是否向上弹出
    const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 })
    const [cursorPosition, setCursorPosition] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)
    const moreButtonRef = useRef<HTMLButtonElement>(null)

    // 检查当前行是否为空
    const isCurrentLineEmpty = useCallback((pos: number): boolean => {
        if (!content) return true

        // 找到当前行的开始和结束位置
        const beforeCursor = content.substring(0, pos)
        const afterCursor = content.substring(pos)

        const lineStart = beforeCursor.lastIndexOf('\n') + 1
        const lineEndOffset = afterCursor.indexOf('\n')
        const lineEnd = lineEndOffset === -1 ? content.length : pos + lineEndOffset

        const currentLine = content.substring(lineStart, lineEnd).trim()
        return currentLine === ''
    }, [content])

    // 使用 textarea-caret 库获取光标坐标
    // 返回相对于 textarea 的 { top, left, height } 坐标
    const getCaretPosition = (pos: number): { top: number; left: number; height: number } | null => {
        const textarea = textareaRef.current
        if (!textarea) return null

        // textarea-caret 返回相对于 textarea 内容区域的坐标
        const coords = getCaretCoordinates(textarea, pos)
        return {
            top: coords.top - textarea.scrollTop,  // 减去滚动偏移
            left: coords.left,
            height: coords.height
        }
    }

    // 计算菜单位置
    const calculatePosition = useCallback((_pos: number) => {
        const textarea = textareaRef.current
        const editorContent = textarea?.closest('.editor-content') as HTMLElement
        if (!textarea || !editorContent) return null

        // 使用 textarea-caret 获取光标相对于 textarea 的坐标
        const caretPos = getCaretPosition(_pos)
        if (!caretPos) return null

        const textareaRect = textarea.getBoundingClientRect()
        const containerRect = editorContent.getBoundingClientRect()

        // 获取真实的行高（从 computed style）
        const style = window.getComputedStyle(textarea)
        const fontSize = parseFloat(style.fontSize)
        const lineHeightStr = style.lineHeight
        let lineHeight: number
        if (lineHeightStr === 'normal') {
            lineHeight = fontSize * 1.2
        } else if (lineHeightStr.endsWith('px')) {
            lineHeight = parseFloat(lineHeightStr)
        } else {
            // 数字形式的 line-height（如 1.8）
            lineHeight = fontSize * parseFloat(lineHeightStr)
        }

        const buttonSize = 28
        const buttonGap = 6

        // 垂直位置：caretPos.top 是光标行顶部，加上行高一半实现居中
        // 手动微调偏移量（正值向下，负值向上）
        const verticalOffset = -5  // 🎯 调整这个值来微调垂直对齐
        const lineCenterY = caretPos.top + (lineHeight / 2)
        const top = (textareaRect.top - containerRect.top) + lineCenterY - (buttonSize / 2) + verticalOffset

        // 水平位置：textarea 左边界 - 容器左边界 - 按钮宽度 - 间距
        const left = textareaRect.left - containerRect.left - buttonSize - buttonGap

        return { top, left }
    }, [textareaRef, content])

    // 监听光标位置变化
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea || !isMarkdown) return

        const handleCursorChange = () => {
            const pos = textarea.selectionStart

            // 只有光标位置（没有选中文字）时检查
            if (textarea.selectionStart !== textarea.selectionEnd) {
                setIsVisible(false)
                return
            }

            if (isCurrentLineEmpty(pos)) {
                const newPos = calculatePosition(pos)
                if (newPos) {
                    setPosition(newPos)
                    setCursorPosition(pos)
                    setIsVisible(true)
                }
            } else {
                setIsVisible(false)
                setIsExpanded(false)
                setShowMore(false)
            }
        }

        // 监听光标变化事件
        textarea.addEventListener('click', handleCursorChange)
        textarea.addEventListener('keyup', handleCursorChange)
        textarea.addEventListener('input', handleCursorChange)

        return () => {
            textarea.removeEventListener('click', handleCursorChange)
            textarea.removeEventListener('keyup', handleCursorChange)
            textarea.removeEventListener('input', handleCursorChange)
        }
    }, [textareaRef, isMarkdown, isCurrentLineEmpty, calculatePosition])

    // 点击外部时关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsExpanded(false)
                setShowMore(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 插入内容
    const insertContent = useCallback((insertText: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        // 保存当前滚动位置
        const scrollContainer = editorScrollRef.current
        const savedScrollTop = scrollContainer?.scrollTop || 0

        const beforeCursor = content.substring(0, cursorPosition)
        const afterCursor = content.substring(cursorPosition)

        const newContent = beforeCursor + insertText + afterCursor
        onChange(newContent)

        // 关闭菜单
        setIsExpanded(false)
        setShowMore(false)
        setIsVisible(false)  // 插入后隐藏加号按钮

        // 恢复焦点、光标位置和滚动位置
        setTimeout(() => {
            textarea.focus()
            const newPos = cursorPosition + insertText.length
            textarea.setSelectionRange(newPos, newPos)

            // 恢复滚动位置
            if (scrollContainer) {
                scrollContainer.scrollTop = savedScrollTop
            }
        }, 10)
    }, [textareaRef, content, cursorPosition, onChange, editorScrollRef])

    // 处理图片插入
    const handleImageInsert = useCallback(async () => {
        try {
            // 获取文件所在目录，如果没有 filePath 就用空字符串（根目录）
            const dirPath = filePath
                ? (filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '')
                : ''

            // 调用文件选择 API
            const imagePath = await window.fs.selectAndCopyImage(dirPath)

            if (imagePath) {
                insertContent(`![](${imagePath})`)
            }
            // 如果用户取消选择，不做任何事
        } catch (error) {
            console.error('图片插入失败:', error)
            // 出错时插入占位符让用户手动填写
            insertContent('![图片描述](url)')
        }

        // 关闭菜单
        setIsExpanded(false)
        setShowMore(false)
    }, [filePath, insertContent])

    // 切换加号按钮展开状态
    const toggleExpand = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsExpanded(!isExpanded)
        setShowMore(false)
    }

    // 切换更多菜单
    const toggleMore = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!showMore) {
            // 判断菜单应该向上还是向下弹出
            if (moreButtonRef.current) {
                const rect = moreButtonRef.current.getBoundingClientRect()
                const moreMenuHeight = 220  // 菜单预估高度
                const spaceBelow = window.innerHeight - rect.bottom
                const spaceAbove = rect.top

                // 如果下方空间不足且上方空间足够，则向上弹出
                setShowMoreAbove(spaceBelow < moreMenuHeight && spaceAbove > moreMenuHeight)
            }
        }

        setShowMore(!showMore)
    }

    if (!isVisible || !isMarkdown) return null

    return (
        <div
            ref={menuRef}
            className={`block-insert-menu ${isExpanded ? 'expanded' : ''}`}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`
            }}
        >
            {/* 加号触发按钮 */}
            <button
                className={`block-insert-trigger ${isExpanded ? 'active' : ''}`}
                onClick={toggleExpand}
                title="插入内容"
            >
                <Plus size={18} strokeWidth={1.5} />
            </button>

            {/* 展开的菜单 */}
            {isExpanded && (
                <div className="block-insert-options">
                    {mainMenuItems.map((item) => (
                        <button
                            key={item.id}
                            className="block-insert-option"
                            onClick={() => item.id === 'image' ? handleImageInsert() : insertContent(item.insert)}
                            title={item.label}
                        >
                            <item.icon size={18} strokeWidth={1.5} />
                        </button>
                    ))}
                    <button
                        ref={moreButtonRef}
                        className={`block-insert-option ${showMore ? 'active' : ''}`}
                        onClick={toggleMore}
                        title="更多"
                    >
                        <MoreHorizontal size={18} strokeWidth={1.5} />
                    </button>
                </div>
            )}

            {/* 更多选项子菜单 - 智能位置 */}
            {showMore && (
                <div className={`block-insert-more ${showMoreAbove ? 'above' : ''}`}>
                    {moreMenuItems.map((item) => (
                        <button
                            key={item.id}
                            className="block-insert-more-item"
                            onClick={() => insertContent(item.insert)}
                        >
                            <item.icon size={14} strokeWidth={1.5} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default BlockInsertMenu
