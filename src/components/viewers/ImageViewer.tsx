import React, { useEffect, useState, useRef, useCallback } from 'react'
import './ImageViewer.css'

interface ImageViewerProps {
    filePath: string
    vaultPath: string
}

const ImageViewer: React.FC<ImageViewerProps> = ({ filePath, vaultPath }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Zoom and pan state
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const lastMousePos = useRef({ x: 0, y: 0 })
    const contentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadImage = async () => {
            try {
                setLoading(true)
                setError(null)

                // 使用 IPC 读取文件 Buffer
                const buffer = await window.fs.readFileBuffer(filePath)

                // 创建 Blob 和临时 URL
                const blob = new Blob([buffer])
                const url = URL.createObjectURL(blob)

                setImageUrl(url)
                setLoading(false)
            } catch (err) {
                console.error('加载图片失败:', err)
                setError('无法加载图片')
                setLoading(false)
            }
        }

        loadImage()

        // 清理函数:释放 Blob URL
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl)
            }
        }
    }, [filePath])

    // Reset zoom/pan when file changes
    useEffect(() => {
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }, [filePath])

    // Handle slider change
    const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newScale = parseFloat(e.target.value)
        setScale(newScale)
        if (newScale <= 1) {
            setPosition({ x: 0, y: 0 })
        }
    }, [])

    // Handle mouse down for panning
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (scale > 1) {
            e.preventDefault()
            setIsDragging(true)
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        }
    }, [scale])

    // Handle mouse move for panning
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            const deltaX = e.clientX - lastMousePos.current.x
            const deltaY = e.clientY - lastMousePos.current.y
            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }))
            lastMousePos.current = { x: e.clientX, y: e.clientY }
        }
    }, [isDragging, scale])

    // Handle mouse up for panning
    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    // Handle wheel zoom (滚轮/触控板缩放) - manually attached for { passive: false }
    useEffect(() => {
        const content = contentRef.current
        if (!content) return

        const onWheel = (e: WheelEvent) => {
            // 阻止默认滚动行为
            e.preventDefault()
            e.stopPropagation()

            // 计算缩放增量（考虑触控板的精细滚动）
            const delta = -e.deltaY * 0.002

            setScale(prev => {
                const newScale = Math.max(0.5, Math.min(5, prev + delta))
                // 如果缩放回 100% 以下，重置位置
                if (newScale <= 1) {
                    setPosition({ x: 0, y: 0 })
                }
                return newScale
            })
        }

        content.addEventListener('wheel', onWheel, { passive: false })
        return () => {
            content.removeEventListener('wheel', onWheel)
        }
    }, [imageUrl])

    if (loading) {
        return <div className="image-viewer-loading">加载中...</div>
    }

    if (error) {
        return <div className="image-viewer-error">{error}</div>
    }

    return (
        <div className="image-viewer">
            {/* Scrollable content container - 放大时禁用滚动避免冲突 */}
            <div
                className="image-viewer-scroll"
                style={{ overflowY: scale > 1 ? 'hidden' : 'auto' }}
            >
                <div className="topbar-spacer" />
                <div
                    ref={contentRef}
                    className={`image-viewer-content ${scale > 1 ? 'zoomed' : ''} ${isDragging ? 'dragging' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt={filePath}
                            style={{
                                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`
                            }}
                            draggable={false}
                        />
                    )}
                </div>
            </div>

            {/* Floating island zoom control */}
            <div className="zoom-island">
                <button
                    className="zoom-island-btn"
                    onClick={() => {
                        const newScale = Math.max(0.5, scale - 0.25)
                        setScale(newScale)
                        if (newScale <= 1) setPosition({ x: 0, y: 0 })
                    }}
                >
                    −
                </button>
                <input
                    type="range"
                    className="zoom-island-slider"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={scale}
                    onChange={handleSliderChange}
                />
                <span className="zoom-island-percent">{Math.round(scale * 100)}%</span>
                <button
                    className="zoom-island-btn"
                    onClick={() => setScale(prev => Math.min(5, prev + 0.25))}
                >
                    +
                </button>
            </div>
        </div>
    )
}

export default ImageViewer
