import React, { useState, useEffect } from 'react'
import './DocxViewer.css'

interface DocxViewerProps {
    filePath: string
}

const DocxViewer: React.FC<DocxViewerProps> = ({ filePath }) => {
    const [htmlContent, setHtmlContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadDocx = async () => {
            try {
                setLoading(true)
                setError(null)

                // 动态导入 mammoth
                const mammoth = await import('mammoth')

                // 通过 Electron IPC 读取文件 Buffer
                const buffer = await window.fs.readFileBuffer(filePath)

                // 转换为 HTML
                const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
                setHtmlContent(result.value)

                if (result.messages.length > 0) {
                    console.warn('Mammoth warnings:', result.messages)
                }
            } catch (err) {
                console.error('加载 DOCX 文件失败:', err)
                setError(err instanceof Error ? err.message : '无法加载文档')
            } finally {
                setLoading(false)
            }
        }

        loadDocx()
    }, [filePath])

    if (loading) {
        return (
            <div className="docx-viewer-loading">
                <div className="loading-spinner"></div>
                <p>加载文档中...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="docx-viewer-error">
                <p>❌ 加载失败</p>
                <p className="error-message">{error}</p>
            </div>
        )
    }

    return (
        <div className="docx-viewer">
            <div
                className="docx-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
        </div>
    )
}

export default DocxViewer
