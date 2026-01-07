/**
 * ResizableDivider - iPad 风格可拖动分隔线
 * 中间有短灰色手柄提示，让用户一眼就知道可以拖动
 */

import React, { useState, useCallback } from 'react'

interface ResizableDividerProps {
    /** 拖动方向: 'left' 表示调整左侧面板, 'right' 表示调整右侧面板 */
    direction: 'left' | 'right'
    /** 拖动时的回调，返回鼠标移动的增量 */
    onResize: (delta: number) => void
    /** 拖动开始时的回调 */
    onResizeStart?: () => void
    /** 拖动结束时的回调 */
    onResizeEnd?: () => void
    /** 双击回调 */
    onDoubleClick?: () => void
    /** 自定义类名 */
    className?: string
}

export const ResizableDivider: React.FC<ResizableDividerProps> = ({
    direction,
    onResize,
    onResizeStart,
    onResizeEnd,
    onDoubleClick,
    className = ''
}) => {
    const [isDragging, setIsDragging] = useState(false)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation() // 防止事件冒泡
        setIsDragging(true)
        onResizeStart?.()

        // 记录初始位置
        const startX = e.clientX

        const handleMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault()
            const currentX = moveEvent.clientX
            // 计算相对于起始点的总位移
            const offset = currentX - startX

            // 对于右侧面板，向右拖动是增加宽度，向左是减少（如果是左侧面板也一样，通常向右是增加x）
            // 但是这里的 direction 参数可能用于反转逻辑
            // 如果是 right（右侧面板），拖动条在左侧，向左拖动是增加宽度？
            // 不，通常右侧面板的分隔线在面板左边。
            // 让我们看看 App.tsx 是怎么用的。
            // 左侧面板分隔线在面板右边：向右拖动 -> 宽度增加。 delta = clientX - startX.
            // 右侧面板分隔线在面板左边：向左拖动 -> 宽度增加。 delta = startX - clientX.

            const adjustedOffset = direction === 'right' ? -offset : offset
            onResize(adjustedOffset)
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            onResizeEnd?.()
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            // 恢复用户选择
            document.body.style.userSelect = ''
            document.body.style.cursor = ''
            document.body.classList.remove('resizing-panels') // 确保清除全局类
        }

        // 禁用用户选择
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'col-resize'
        document.body.classList.add('resizing-panels')

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [direction, onResize, onResizeStart, onResizeEnd])

    return (
        <div
            className={`resizable-divider ${isDragging ? 'dragging' : ''} ${className}`}
            onMouseDown={handleMouseDown}
            onDoubleClick={onDoubleClick}
        >
            {/* iPad 风格短手柄提示 */}
            <div className="divider-handle" />
        </div>
    )
}

export default ResizableDivider
