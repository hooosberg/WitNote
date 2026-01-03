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
    height?: number
    padding: string
    fontSize: string
    fontFamily: string
    lineHeight: string
    letterSpacing: string
    whiteSpace: string
    wordBreak: string
    overflowWrap: string
    scrollTop: number
    textAlign: string
    fontWeight: string
    fontStyle: string
    fontVariant: string
    tabSize: string
    textIndent: string
    textTransform: string
    textRendering: string
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

        const computedStyle = window.getComputedStyle(textarea)

        // 使用 absolute 定位，相对于共同的父容器 (div relative)
        // 这样可以自动随内容滚动，且会被父容器的 overflow hidden 正确裁剪（解决遮挡 TopBar 问题）
        return {
            top: textarea.offsetTop,
            left: textarea.offsetLeft,
            // 精确修正：减去滚动条宽度和潜在边框差值 (offsetWidth - clientWidth)
            // 这确保了 Mirror 的可用宽度与 Textarea 的实际内容宽度完全一致（排除滚动条区域）
            width: textarea.getBoundingClientRect().width - (textarea.offsetWidth - textarea.clientWidth),
            padding: computedStyle.padding,
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            lineHeight: computedStyle.lineHeight,
            letterSpacing: computedStyle.letterSpacing,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',   // 强制匹配 editor-body 的 break-all
            overflowWrap: 'anywhere', // 强制匹配 editor-body 的 anywhere
            scrollTop: textarea.scrollTop,
            textAlign: computedStyle.textAlign,
            fontWeight: computedStyle.fontWeight,
            fontStyle: computedStyle.fontStyle,
            fontVariant: computedStyle.fontVariant,
            tabSize: computedStyle.tabSize,
            textIndent: computedStyle.textIndent,
            textTransform: computedStyle.textTransform,
            textRendering: computedStyle.textRendering
        }
    }, [textareaRef])

    // 监听窗口大小变化（滚动由 absolute 布局自动处理）
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea || (!suggestion && !isLoading)) return

        const updateStyle = () => {
            const style = calculateMirrorStyle()
            if (style) {
                setMirrorStyle(style)
            }
        }

        const handleResize = () => {
            updateStyle()
        }

        // 初始化
        updateStyle()

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [textareaRef, suggestion, isLoading, content, cursorPosition, calculateMirrorStyle])

    // 不显示的情况
    if (!mirrorStyle || (!suggestion && !isLoading)) {
        return null
    }

    // 计算当前是否处于"幽灵模式"（即完全接管显示）
    // 只有在有建议且不再加载时，才显示完整的镜像层
    const isGhostMode = !!suggestion && !isLoading

    // 计算光标前的文本
    const cursorPos = getCursorPos()
    const textBeforeCursor = content.slice(0, cursorPos)

    return (
        <div
            className="autocomplete-mirror"
            style={{
                position: 'absolute', // 修改为 absolute
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
                textAlign: mirrorStyle.textAlign as any,
                fontWeight: mirrorStyle.fontWeight,
                fontStyle: mirrorStyle.fontStyle,
                fontVariant: mirrorStyle.fontVariant,
                tabSize: mirrorStyle.tabSize,
                textIndent: mirrorStyle.textIndent,
                textTransform: mirrorStyle.textTransform as any,
                textRendering: mirrorStyle.textRendering as any,
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
                    // top: `-${mirrorStyle.scrollTop}px` // absolute 布局不需要反向滚动
                }}
            >
                {/* 
                  镜像层现在负责渲染完整内容：
                  1. 光标前文字: 
                     - Loading 时 hidden (只占位，不显示，避免重影)
                     - Suggestion 时 visible (替代编辑器显示)
                  2. 联想建议: Visible (Gray)
                  3. 光标后文字: 
                     - Loading 时 不渲染 (不挤占空间，让原文字保持位置)
                     - Suggestion 时 visible (被挤开)
                */}
                <span style={{
                    visibility: isGhostMode ? 'visible' : 'hidden',
                    whiteSpace: 'pre-wrap'
                }}>
                    {textBeforeCursor}
                </span>

                {/* 可见的续写建议 */}
                {isLoading ? (
                    <span className="autocomplete-loading">
                        <span className="autocomplete-loading-dot" style={{ animationDelay: '0s' }}>.</span>
                        <span className="autocomplete-loading-dot" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="autocomplete-loading-dot" style={{ animationDelay: '0.4s' }}>.</span>
                    </span>
                ) : (
                    <span className="autocomplete-suggestion">{suggestion}</span>
                )}

                {/* 光标后文字 - 仅在有建议时渲染，形成挤压效果 */}
                {isGhostMode && (
                    <span style={{
                        visibility: 'visible',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {content.slice(cursorPos)}
                    </span>
                )}
            </div>
        </div>
    )
}

export default AutocompletePopup
