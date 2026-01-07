import React, { lazy, Suspense } from 'react'
import Editor from '../Editor'
import { FileNode } from '../../hooks/useFileSystem'
import { EDITABLE_EXTENSIONS, IMAGE_EXTENSIONS } from '../../hooks/useFileSystem'

// 懒加载 Viewers
const PdfViewer = lazy(() => import('./PdfViewer'))
const DocxViewer = lazy(() => import('./DocxViewer'))
const ImageViewer = lazy(() => import('./ImageViewer'))

interface SmartFileViewerProps {
    file: FileNode
    vaultPath: string
    content?: string
    onChange?: (content: string) => void
    previewMode?: 'edit' | 'preview' | 'split'
    [key: string]: any // 传递给 Editor 的其他 props
}

const SmartFileViewer: React.FC<SmartFileViewerProps> = ({
    file,
    vaultPath,
    content,
    onChange,
    previewMode,
    ...editorProps
}) => {
    const extension = file.extension?.toLowerCase() || ''

    // 可编辑文件 → Editor
    if (EDITABLE_EXTENSIONS.includes(extension)) {
        return (
            <Editor
                content={content || ''}
                onChange={onChange || (() => { })}
                fileName={file.name}
                fileExtension={extension}
                filePath={file.path}
                vaultPath={vaultPath}
                previewMode={previewMode || 'edit'}
                key={file.path}
                {...editorProps}
            />
        )
    }

    // PDF → PdfViewer
    if (extension === '.pdf') {
        return (
            <Suspense fallback={<div className="viewer-loading">加载 PDF 中...</div>}>
                <PdfViewer filePath={file.path} />
            </Suspense>
        )
    }

    // DOCX → DocxViewer
    if (extension === '.docx') {
        return (
            <Suspense fallback={<div className="viewer-loading">加载文档中...</div>}>
                <DocxViewer filePath={file.path} />
            </Suspense>
        )
    }

    // 图片 → ImageViewer
    if (IMAGE_EXTENSIONS.includes(extension)) {
        return (
            <Suspense fallback={<div className="viewer-loading">加载图片中...</div>}>
                <ImageViewer filePath={file.path} vaultPath={vaultPath} />
            </Suspense>
        )
    }

    // 不支持的格式
    return (
        <div className="unsupported-file">
            <p>不支持的文件格式: {extension}</p>
        </div>
    )
}

export default SmartFileViewer
