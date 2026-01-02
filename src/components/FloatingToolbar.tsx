/**
 * 浮动工具栏组件
 * 选中文字时显示，提供 Markdown 快捷格式化功能
 */

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, Link, Heading1, Heading2, Quote } from 'lucide-react'
import getCaretCoordinates from 'textarea-caret'

interface FloatingToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>
    content: string
    onChange: (content: string) => void
    editorScrollRef: React.RefObject<HTMLDivElement>
}

interface ToolbarPosition {
    top: number
    left: number
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
    textareaRef,
    content,
    onChange
}) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 })
    const [selection, setSelection] = useState({ start: 0, end: 0 })

    // 使用 textarea-caret 库获取光标坐标
    // 返回相对于 textarea 的 { top, left, height } 坐标
    const getCaretPosition = useCallback((pos: number): { top: number; left: number; height: number } | null => {
        const textarea = textareaRef.current
        if (!textarea) return null

        // textarea-caret 返回相对于 textarea 内容区域的坐标
        const coords = getCaretCoordinates(textarea, pos)
        return {
            top: coords.top - textarea.scrollTop,  // 减去滚动偏移
            left: coords.left,
            height: coords.height
        }
    }, [textareaRef])

    // 计算工具栏位置（使用视口坐标，因为通过 Portal 渲染到 body）
    const calculatePosition = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return null

        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        // 没有选中文字时不显示
        if (start === end) return null

        // 使用 textarea-caret 获取选区起始和结束位置的坐标
        const startPos = getCaretPosition(start)
        const endPos = getCaretPosition(end)
        if (!startPos || !endPos) return null

        const textareaRect = textarea.getBoundingClientRect()

        // 工具栏尺寸
        const toolbarWidth = 280
        const toolbarHeight = 44

        // 🎯 ===== 手动微调偏移量 =====
        // horizontalOffset: 正值向右移动，负值向左移动
        // verticalOffset: 正值向下移动，负值向上移动
        const horizontalOffset = 37  // 调整水平对齐
        const verticalOffset = 0    // 调整垂直对齐
        // ============================

        // 获取 textarea 的 padding 和 border，因为 textarea-caret 返回的是相对于内容区域的坐标
        const textareaStyle = window.getComputedStyle(textarea)
        const paddingLeft = parseFloat(textareaStyle.paddingLeft) || 0
        const paddingTop = parseFloat(textareaStyle.paddingTop) || 0
        const borderLeft = parseFloat(textareaStyle.borderLeftWidth) || 0
        const borderTop = parseFloat(textareaStyle.borderTopWidth) || 0

        // 垂直位置：直接使用视口坐标
        // textareaRect.top 是 textarea 边框在视口中的位置
        // 加上 padding + border + startPos.top（相对内容区域）得到选区在视口中的位置
        const selectionTop = textareaRect.top + paddingTop + borderTop + startPos.top
        const top = selectionTop - toolbarHeight - 8 + verticalOffset

        // 水平位置：需要考虑选区是否跨行
        let selectionCenterX: number

        if (startPos.top === endPos.top) {
            // 同一行：取选区起始和结束位置的水平中点
            const startX = textareaRect.left + paddingLeft + borderLeft + startPos.left
            const endX = textareaRect.left + paddingLeft + borderLeft + endPos.left
            selectionCenterX = (startX + endX) / 2
        } else {
            // 跨多行：工具栏显示在第一行上方
            // 水平居中于第一行 - 从起始位置到该行末尾的中点
            const startX = textareaRect.left + paddingLeft + borderLeft + startPos.left
            const lineEndX = textareaRect.right - parseFloat(textareaStyle.paddingRight || '0') - 20
            selectionCenterX = (startX + lineEndX) / 2
        }

        let left = selectionCenterX - (toolbarWidth / 2) + horizontalOffset

        // 边界检查：使用视口宽度
        const maxLeft = window.innerWidth - toolbarWidth - 10
        left = Math.max(10, Math.min(left, maxLeft))

        return {
            top: Math.max(10, top),  // 垂直方向保留最小值防止超出顶部
            left
        }
    }, [textareaRef, content, getCaretPosition])

    // 监听选区变化
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const handleSelectionChange = () => {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd

            if (start !== end) {
                // 检查选中内容是否只是空白字符（空格、换行、制表符等）
                const selectedText = content.substring(start, end)
                if (selectedText.trim() === '') {
                    // 选中的只是空白字符，不显示工具栏
                    setIsVisible(false)
                    return
                }

                const pos = calculatePosition()
                if (pos) {
                    setPosition(pos)
                    setSelection({ start, end })
                    setIsVisible(true)
                }
            } else {
                setIsVisible(false)
            }
        }

        // 监听多种事件来捕获选区变化
        textarea.addEventListener('mouseup', handleSelectionChange)
        textarea.addEventListener('keyup', handleSelectionChange)
        document.addEventListener('selectionchange', handleSelectionChange)

        return () => {
            textarea.removeEventListener('mouseup', handleSelectionChange)
            textarea.removeEventListener('keyup', handleSelectionChange)
            document.removeEventListener('selectionchange', handleSelectionChange)
        }
    }, [textareaRef, calculatePosition])

    // 点击外部时隐藏工具栏
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const toolbar = document.querySelector('.floating-toolbar')
            if (toolbar && !toolbar.contains(e.target as Node)) {
                // 延迟隐藏，避免影响按钮点击
                setTimeout(() => {
                    const textarea = textareaRef.current
                    if (textarea && textarea.selectionStart === textarea.selectionEnd) {
                        setIsVisible(false)
                    }
                }, 100)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [textareaRef])

    // 应用格式化
    const applyFormat = useCallback((prefix: string, suffix: string, isBlock: boolean = false) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const { start, end } = selection
        const selectedText = content.substring(start, end)

        let newContent: string
        let newCursorPos: number

        if (isBlock) {
            // 块级格式（如标题）：替换整行
            const beforeSelection = content.substring(0, start)
            const afterSelection = content.substring(end)
            const lineStart = beforeSelection.lastIndexOf('\n') + 1
            const lineEnd = afterSelection.indexOf('\n')
            const fullLineEnd = lineEnd === -1 ? content.length : end + lineEnd

            const lineBefore = content.substring(0, lineStart)
            const lineAfter = content.substring(fullLineEnd)
            const lineContent = content.substring(lineStart, fullLineEnd)

            // 检查是否已有该格式
            if (lineContent.startsWith(prefix)) {
                // 移除格式
                newContent = lineBefore + lineContent.substring(prefix.length) + lineAfter
                newCursorPos = start - prefix.length
            } else {
                // 添加格式
                newContent = lineBefore + prefix + lineContent + lineAfter
                newCursorPos = start + prefix.length
            }
        } else {
            // 行内格式（如粗体、斜体）
            const beforeSelection = content.substring(0, start)
            const afterSelection = content.substring(end)

            // 检查是否已有该格式
            if (beforeSelection.endsWith(prefix) && afterSelection.startsWith(suffix)) {
                // 移除格式
                newContent = beforeSelection.slice(0, -prefix.length) + selectedText + afterSelection.slice(suffix.length)
                newCursorPos = start - prefix.length
            } else {
                // 添加格式
                newContent = beforeSelection + prefix + selectedText + suffix + afterSelection
                newCursorPos = end + prefix.length + suffix.length
            }
        }

        onChange(newContent)
        setIsVisible(false)

        // 恢复光标位置
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }, [textareaRef, content, selection, onChange])

    // 添加链接
    const addLink = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const { start, end } = selection
        const selectedText = content.substring(start, end)

        const url = prompt('请输入链接地址:', 'https://')
        if (url === null) return

        const linkText = `[${selectedText}](${url})`
        const newContent = content.substring(0, start) + linkText + content.substring(end)

        onChange(newContent)
        setIsVisible(false)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + linkText.length, start + linkText.length)
        }, 0)
    }, [textareaRef, content, selection, onChange])

    if (!isVisible) return null

    // 使用 Portal 渲染到 body，确保 z-index 能全局生效，不被父容器的层叠上下文限制
    return createPortal(
        <div
            className="floating-toolbar"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`
            }}
        >
            <button
                className="floating-toolbar-btn"
                onClick={() => applyFormat('**', '**')}
                title="粗体"
            >
                <Bold size={14} strokeWidth={2.5} />
            </button>
            <button
                className="floating-toolbar-btn"
                onClick={() => applyFormat('*', '*')}
                title="斜体"
            >
                <Italic size={14} strokeWidth={2} />
            </button>
            <button
                className="floating-toolbar-btn"
                onClick={addLink}
                title="链接"
            >
                <Link size={14} strokeWidth={2} />
            </button>
            <div className="floating-toolbar-divider" />
            <button
                className="floating-toolbar-btn"
                onClick={() => applyFormat('# ', '', true)}
                title="大标题"
            >
                <Heading1 size={14} strokeWidth={2} />
            </button>
            <button
                className="floating-toolbar-btn"
                onClick={() => applyFormat('## ', '', true)}
                title="小标题"
            >
                <Heading2 size={14} strokeWidth={2} />
            </button>
            <button
                className="floating-toolbar-btn"
                onClick={() => applyFormat('> ', '', true)}
                title="引用"
            >
                <Quote size={14} strokeWidth={2} />
            </button>
        </div>,
        document.body
    )
}

export default FloatingToolbar
