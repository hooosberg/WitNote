/**
 * 浮动工具栏组件
 * 选中文字时显示，提供 Markdown 快捷格式化功能
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Bold, Italic, Link, Heading1, Heading2, Quote } from 'lucide-react'

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
    onChange,
    editorScrollRef
}) => {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 })
    const [selection, setSelection] = useState({ start: 0, end: 0 })

    // 计算工具栏位置（简化版：使用行号计算）
    const calculatePosition = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return null

        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        // 没有选中文字时不显示
        if (start === end) return null

        // 获取选区起始位置所在行号
        const textBeforeStart = content.substring(0, start)
        const lineNumber = textBeforeStart.split('\n').length - 1

        // 获取选中文字在当前行的位置
        const currentLineStart = textBeforeStart.lastIndexOf('\n') + 1
        const charInLine = start - currentLineStart
        const selectedText = content.substring(start, end)
        const selectionLength = selectedText.split('\n')[0].length // 只考虑第一行

        // 获取样式信息
        const computedStyle = getComputedStyle(textarea)
        const lineHeight = parseFloat(computedStyle.lineHeight) || 30
        const fontSize = parseFloat(computedStyle.fontSize) || 17
        const charWidth = fontSize * 0.55 // 估算字符宽度

        // 工具栏尺寸
        const toolbarWidth = 280
        const toolbarHeight = 44

        // 垂直位置：选区所在行的上方
        const top = textarea.offsetTop + (lineNumber * lineHeight) - toolbarHeight - 8
        // 水平位置：选中文字的中心位置
        const selectionCenterX = (charInLine + selectionLength / 2) * charWidth
        const left = textarea.offsetLeft + selectionCenterX - (toolbarWidth / 2)

        return {
            top: Math.max(10, top),
            left: Math.max(10, left)
        }
    }, [textareaRef, content])

    // 监听选区变化
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return

        const handleSelectionChange = () => {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd

            if (start !== end) {
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

    return (
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
        </div>
    )
}

export default FloatingToolbar
