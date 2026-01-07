import React, { useState, useEffect } from 'react'
import './PdfViewer.css'

interface PdfViewerProps {
    filePath: string
}

const PdfViewer: React.FC<PdfViewerProps> = ({ filePath }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadPdf = async () => {
            try {
                setLoading(true)
                setError(null)

                // 通过 IPC 读取 PDF 文件的 Buffer
                const buffer = await window.fs.readFileBuffer(filePath)

                // 创建 Blob 和 Object URL
                const blob = new Blob([buffer], { type: 'application/pdf' })
                const url = URL.createObjectURL(blob)

                setPdfUrl(url)
            } catch (err) {
                console.error('加载 PDF 文件失败:', err)
                setError(err instanceof Error ? err.message : '无法加载 PDF')
            } finally {
                setLoading(false)
            }
        }

        loadPdf()

        // 清理函数: 释放 Object URL
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl)
            }
        }
    }, [filePath])

    if (loading) {
        return (
            <div className="pdf-viewer-loading">
                <div className="loading-spinner"></div>
                <p>加载 PDF 中...</p>
            </div>
        )
    }

    if (error || !pdfUrl) {
        return (
            <div className="pdf-viewer-error">
                <p>❌ 加载失败</p>
                <p className="error-message">{error || '无法加载 PDF'}</p>
            </div>
        )
    }

    return (
        <div className="pdf-viewer">
            {/* Scrollable container - matches Editor pattern for frosted glass effect */}
            <div className="pdf-viewer-scroll">
                <div className="topbar-spacer" />
                <div className="pdf-viewer-content">
                    <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&zoom=page-width`}
                        title="PDF Preview"
                        style={{
                            width: '100%',
                            height: 'calc(100vh - var(--titlebar-height) - 40px)',
                            border: 'none',
                            display: 'block',
                            background: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default PdfViewer
