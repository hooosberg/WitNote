/**
 * 自动补全弹出组件
 * 使用"镜像层"方案：渲染透明的原文 + 可见的续写建议
 * 这样续写文字会自然地按照相同排版规则换行
 */

import React, { useEffect, useState, useCallback } from 'react'

interface AutocompletePopupProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>
    /** 当前文本内容 */
    content?: string
    /** 当前光标位置（用于确定续写的起点） */
    cursorPosition?: number
    suggestion: string | null
    isLoading?: boolean
}

interface MirrorStyle {
    top: number
    left: number
    width: number
    height: number
    padding: string
    fontSize: string
    fontFamily: string
    lineHeight: string
    letterSpacing: string
    whiteSpace: string
    wordBreak: string
    overflowWrap: string
    scrollTop: number
}

export const AutocompletePopup: React.FC<AutocompletePopupProps> = ({
    textareaRef,
    content = '',
    cursorPosition,
    suggestion,
    isLoading = false
}) => {
    const [mirrorStyle, setMirrorStyle] = useState<MirrorStyle | null>(null)

    // 计算光标位置（优先使用传入的，否则从 textarea 获取）
    const getCursorPos = useCallback(() => {
        if (cursorPosition !== undefined) {
            return cursorPosition
        }
        return textareaRef.current?.selectionStart ?? content.length
    }, [cursorPosition, textareaRef, content.length])

    // 获取 textarea 的样式和位置
    const calculateMirrorStyle = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return null

        const textareaRect = textarea.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(textarea)

        return {
            top: textareaRect.top,
            left: textareaRect.left,
            width: textarea.clientWidth,
            height: textarea.clientHeight,
            padding: computedStyle.padding,
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            lineHeight: computedStyle.lineHeight,
            letterSpacing: computedStyle.letterSpacing,
            whiteSpace: 'pre-wrap',
            wordBreak: computedStyle.wordBreak || 'break-word',
            overflowWrap: computedStyle.overflowWrap || 'break-word',
            scrollTop: textarea.scrollTop
        }
    }, [textareaRef])

    // 更新镜像样式
    useEffect(() => {
        if (!suggestion && !isLoading) {
            setMirrorStyle(null)
            return
        }

        const style = calculateMirrorStyle()
        if (style) {
            setMirrorStyle(style)
        }
    }, [suggestion, isLoading, content, cursorPosition, calculateMirrorStyle])

    // 监听滚动和窗口变化
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea || (!suggestion && !isLoading)) return

        const updateStyle = () => {
            const style = calculateMirrorStyle()
            if (style) {
                setMirrorStyle(style)
            }
        }

        textarea.addEventListener('scroll', updateStyle)
        window.addEventListener('resize', updateStyle)
        window.addEventListener('scroll', updateStyle, true)

        return () => {
            textarea.removeEventListener('scroll', updateStyle)
            window.removeEventListener('resize', updateStyle)
            window.removeEventListener('scroll', updateStyle, true)
        }
    }, [textareaRef, suggestion, isLoading, calculateMirrorStyle])

    // 不显示的情况
    if (!mirrorStyle || (!suggestion && !isLoading)) {
        return null
    }

    // 计算光标前的文本
    const cursorPos = getCursorPos()
    const textBeforeCursor = content.slice(0, cursorPos)

    return (
        <div
            className="autocomplete-mirror"
            style={{
                position: 'fixed',
                top: `${mirrorStyle.top}px`,
                left: `${mirrorStyle.left}px`,
                width: `${mirrorStyle.width}px`,
                // 不限制高度，让内容自然显示
                // height: `${mirrorStyle.height}px`,
                padding: mirrorStyle.padding,
                fontSize: mirrorStyle.fontSize,
                fontFamily: mirrorStyle.fontFamily,
                lineHeight: mirrorStyle.lineHeight,
                letterSpacing: mirrorStyle.letterSpacing,
                whiteSpace: mirrorStyle.whiteSpace as 'pre-wrap',
                wordBreak: mirrorStyle.wordBreak as 'break-word',
                overflowWrap: mirrorStyle.overflowWrap as 'break-word',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 100,
                boxSizing: 'border-box'
            }}
        >
            {/* 内部滚动容器，与 textarea 同步滚动 */}
            <div
                style={{
                    position: 'relative',
                    top: `-${mirrorStyle.scrollTop}px`
                }}
            >
                {/* 透明的原文（占位用） */}
                <span style={{
                    visibility: 'hidden',
                    whiteSpace: 'pre-wrap'
                }}>
                    {textBeforeCursor}
                </span>
                {/* 可见的续写建议 */}
                {isLoading ? (
                    <span className="autocomplete-loading">...</span>
                ) : (
                    <span className="autocomplete-suggestion">{suggestion}</span>
                )}
            </div>
        </div>
    )
}

export default AutocompletePopup
