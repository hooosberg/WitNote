/**
 * 编辑器组件
 * 中文占位符 + 右上角新建按钮
 */

import React, { useRef, useEffect, useState } from 'react'
import { FileText, FileCode, Plus } from 'lucide-react'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    fileName: string
    fileExtension: string
    onTitleChange?: (newName: string) => void
    onFormatToggle?: () => void
    onNewFile?: () => void
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    fileName,
    fileExtension,
    onTitleChange,
    onFormatToggle,
    onNewFile
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleRef = useRef<HTMLInputElement>(null)
    const [title, setTitle] = useState('')

    useEffect(() => {
        const baseName = fileName.replace(/\.[^/.]+$/, '')
        setTitle(baseName)
    }, [fileName])

    useEffect(() => {
        const textarea = textareaRef.current
        if (textarea) {
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
        }
    }, [content])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value)
    }

    const handleTitleBlur = () => {
        if (onTitleChange && title.trim()) {
            const ext = fileExtension.startsWith('.') ? fileExtension.slice(1) : fileExtension
            const newFileName = `${title.trim()}.${ext}`
            if (newFileName !== fileName) {
                onTitleChange(newFileName)
            }
        }
    }

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
            {/* 右上角：格式 + 新建 */}
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

                {/* 新建按钮 */}
                {onNewFile && (
                    <button className="editor-new-btn" onClick={onNewFile} title="新建日记">
                        <Plus size={18} strokeWidth={1.5} />
                    </button>
                )}
            </div>

            {/* 标题 - 中文占位符 */}
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
                placeholder="写下你的想法..."
                spellCheck={false}
            />
        </div>
    )
}

export default Editor
