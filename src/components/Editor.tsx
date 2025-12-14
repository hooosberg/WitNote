/**
 * Medium 风格编辑器
 * 优化：右上角布局（图标+格式徽标）
 */

import React, { useRef, useEffect, useState } from 'react'
import { FileText, FileCode } from 'lucide-react'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    fileName: string
    fileExtension: string
    onTitleChange?: (newName: string) => void
    onFormatToggle?: () => void
    placeholder?: string
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    fileName,
    fileExtension,
    onTitleChange,
    onFormatToggle,
    placeholder = '写下你的想法...'
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleRef = useRef<HTMLInputElement>(null)
    const [title, setTitle] = useState('')

    // 从文件名提取标题
    useEffect(() => {
        const baseName = fileName.replace(/\.[^/.]+$/, '')
        setTitle(baseName)
    }, [fileName])

    // 自动调整 textarea 高度
    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
        }
    }, [content])

    // 处理标题变化
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
    }

    // 标题失焦时保存
    const handleTitleBlur = () => {
        if (onTitleChange && title.trim()) {
            const ext = fileExtension.startsWith('.') ? fileExtension.slice(1) : fileExtension
            const newFileName = `${title.trim()}.${ext}`
            if (newFileName !== fileName) {
                onTitleChange(newFileName)
            }
        }
    }

    // 标题回车
    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            titleRef.current?.blur()
            textareaRef.current?.focus()
        }
    }

    const isMarkdown = fileExtension === 'md' || fileExtension === '.md'

    return (
        <div className="medium-editor">
            {/* 右上角：图标 + 格式徽标 */}
            <div className="editor-top-bar">
                <div className="editor-spacer" />

                <div className="editor-format-badge">
                    <span className="format-icon">
                        {isMarkdown ? (
                            <FileCode size={14} strokeWidth={1.5} />
                        ) : (
                            <FileText size={14} strokeWidth={1.5} />
                        )}
                    </span>
                    <button
                        className="format-toggle"
                        onClick={onFormatToggle}
                        title="切换格式"
                    >
                        {isMarkdown ? 'MD' : 'TXT'}
                    </button>
                </div>
            </div>

            {/* 标题 */}
            <input
                ref={titleRef}
                type="text"
                className="editor-title"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                placeholder="标题"
                spellCheck={false}
            />

            {/* 正文 */}
            <textarea
                ref={textareaRef}
                className="editor-body"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                spellCheck={false}
            />
        </div>
    )
}

export default Editor
