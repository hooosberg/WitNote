import React, { useEffect, useState } from 'react'
import './ImageViewer.css'

interface ImageViewerProps {
    filePath: string
    vaultPath: string
}

const ImageViewer: React.FC<ImageViewerProps> = ({ filePath, vaultPath }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

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

    if (loading) {
        return <div className="image-viewer-loading">加载中...</div>
    }

    if (error) {
        return <div className="image-viewer-error">{error}</div>
    }

    return (
        <div className="image-viewer">
            {imageUrl && <img src={imageUrl} alt={filePath} />}
        </div>
    )
}

export default ImageViewer
