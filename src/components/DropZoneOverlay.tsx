/**
 * 拖拽放置区覆盖层组件
 * 当用户从文件树拖拽文件到编辑区时显示
 * 提供左/右两个放置区域供用户选择
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelLeft, PanelRight } from 'lucide-react'

interface DropZoneOverlayProps {
    visible: boolean
    onDrop: (position: 'left' | 'right', e: React.DragEvent) => void
    onDragLeave: () => void
}

const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({
    visible,
    onDrop,
    onDragLeave
}) => {
    const { t } = useTranslation()
    const [hoverPosition, setHoverPosition] = useState<'left' | 'right' | null>(null)

    // 当 visible 变为 false 时重置 hoverPosition
    useEffect(() => {
        if (!visible) {
            setHoverPosition(null)
        }
    }, [visible])

    // 使用 useCallback 避免闭包问题
    const handleDragOver = useCallback((e: React.DragEvent, position: 'left' | 'right') => {
        e.preventDefault()
        e.stopPropagation()
        setHoverPosition(position)
    }, [])

    // 简化离开检测，直接使用计时器来处理边界情况
    const handleDragLeaveZone = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        // 使用 relatedTarget 检查是否真的离开了覆盖层
        const relatedTarget = e.relatedTarget as Node | null
        const currentTarget = e.currentTarget as HTMLElement

        // 如果接下来进入的元素还在覆盖层内，不触发离开
        if (relatedTarget && currentTarget.contains(relatedTarget)) {
            return
        }

        setHoverPosition(null)
        onDragLeave()
    }, [onDragLeave])

    const handleDrop = useCallback((e: React.DragEvent, position: 'left' | 'right') => {
        e.preventDefault()
        e.stopPropagation()
        setHoverPosition(null)
        onDrop(position, e)
    }, [onDrop])

    // 如果不可见，返回 null
    if (!visible) return null

    return (
        <div
            className="drop-zone-overlay"
            onDragLeave={handleDragLeaveZone}
            onDragOver={(e) => e.preventDefault()}
        >
            <div
                className={`drop-zone left ${hoverPosition === 'left' ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 'left')}
                onDrop={(e) => handleDrop(e, 'left')}
            >
                <div className="drop-zone-content">
                    <PanelLeft size={32} strokeWidth={1.5} />
                    <span>{t('dropZone.left', '放到左侧')}</span>
                </div>
            </div>
            <div
                className={`drop-zone right ${hoverPosition === 'right' ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 'right')}
                onDrop={(e) => handleDrop(e, 'right')}
            >
                <div className="drop-zone-content">
                    <PanelRight size={32} strokeWidth={1.5} />
                    <span>{t('dropZone.right', '放到右侧')}</span>
                </div>
            </div>
        </div>
    )
}

export default DropZoneOverlay
