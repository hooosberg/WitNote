/**
 * 编辑器组件
 * 修复：标题默认空白+灰色占位符、标题自动换行、自适应高度
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
    focusMode?: boolean
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    fileName,
    fileExtension,
    onTitleChange,
    onFormatToggle,
    focusMode = false
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleRef = useRef<HTMLTextAreaElement>(null)
    const [title, setTitle] = useState('')

    // 判断是否为新建的未命名文件
    const isUntitled = fileName.startsWith('Untitled_')

    useEffect(() => {
        // 如果是未命名文件，显示空白让用户输入
        if (isUntitled) {
            setTitle('')
        } else {
            const baseName = fileName.replace(/\.[^/.]+$/, '')
            setTitle(baseName)
        }
    }, [fileName, isUntitled])

    // 自动调整文本域高度
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto'
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
        }
    }, [title])

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [content])

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value)
        // 自动调整高度
        e.target.style.height = 'auto'
        e.target.style.height = `${e.target.scrollHeight}px`
    }

    const handleTitleBlur = () => {
        if (onTitleChange) {
            const ext = fileExtension.startsWith('.') ? fileExtension.slice(1) : fileExtension
            // 默认标题使用当前时间
            let newTitle = title.trim()
            if (!newTitle) {
                const now = new Date()
                newTitle = `未命名：${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
            }
            const newFileName = `${newTitle}.${ext}`
            if (newFileName !== fileName) {
                onTitleChange(newFileName)
            }
        }
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        // Shift+Enter 换行，Enter 保存并跳到正文
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            titleRef.current?.blur()
            textareaRef.current?.focus()
        }
    }

    const isMarkdown = fileExtension === 'md' || fileExtension === '.md'

    return (
        <div className="editor-container">
            {/* 顶部工具栏 - 水平对齐 */}
            <div className={`editor-toolbar ${focusMode ? 'focus-mode' : ''}`}>
                <div className="toolbar-group">
                    <button
                        className="format-badge"
                        onClick={onFormatToggle}
                        title="切换格式"
                    >
                        <span className="format-icon">
                            {isMarkdown ? (
                                <FileCode size={14} strokeWidth={1.5} />
                            ) : (
                                <FileText size={14} strokeWidth={1.5} />
                            )}
                        </span>
                        <span className="format-label">
                            {isMarkdown ? 'MD' : 'TXT'}
                        </span>
                    </button>
                </div>
            </div>

            {/* 编辑区域 - 可滚动 */}
            <div className="editor-scroll">
                <div className="editor-content">
                    {/* 标题 - 自动换行 */}
                    <textarea
                        ref={titleRef}
                        className="editor-title"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        placeholder="标题"
                        rows={1}
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
            </div>
        </div>
    )
}

export default Editor
