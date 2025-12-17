/**
 * 编辑器组件
 * 修复：标题默认空白+灰色占位符、标题自动换行、自适应高度
 * 新增：MD 预览功能、回车自动缩进
 */

import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    fileName: string
    fileExtension: string
    onTitleChange?: (newName: string) => void
    onFormatToggle?: () => void
    focusMode?: boolean
    createdAt?: number
    modifiedAt?: number
}

// 配置 marked 使用 GitHub 风格
marked.setOptions({
    gfm: true,        // GitHub Flavored Markdown
    breaks: true,     // 换行转 <br>
})

/**
 * 渲染 LaTeX 公式
 * 注意：需要保护 <code> 和 <pre> 标签内的内容不被渲染
 */
const renderLatex = (html: string): string => {
    // 临时占位符保护 code 和 pre 标签内容
    const codeBlocks: string[] = []
    const placeholder = '___CODE_BLOCK_PLACEHOLDER___'

    // 1. 提取并保护所有 code 和 pre 标签内容
    html = html.replace(/<(code|pre)[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
        codeBlocks.push(match)
        return placeholder + (codeBlocks.length - 1) + '___'
    })

    // 2. 渲染块级公式 $$...$$ (支持多行)
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), {
                displayMode: true,
                throwOnError: false
            })
        } catch {
            return `<span class="latex-error">$$${formula}$$</span>`
        }
    })

    // 3. 渲染行内公式 $...$ (单行，避免匹配 $$)
    html = html.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, formula) => {
        try {
            return katex.renderToString(formula.trim(), {
                displayMode: false,
                throwOnError: false
            })
        } catch {
            return `<span class="latex-error">$${formula}$</span>`
        }
    })

    // 4. 恢复 code 和 pre 标签内容
    html = html.replace(new RegExp(placeholder + '(\\d+)___', 'g'), (_, index) => {
        return codeBlocks[parseInt(index)]
    })

    return html
}

/**
 * 使用 marked + KaTeX 渲染 Markdown
 * 支持完整的 GitHub 风格语法 + LaTeX 数学公式
 */
const renderMarkdown = (md: string): string => {
    try {
        let html = marked(md) as string
        html = renderLatex(html)
        return html
    } catch {
        return md
    }
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    fileName,
    fileExtension,
    onTitleChange,
    onFormatToggle,
    focusMode = false,
    createdAt,
    modifiedAt
}) => {
    const { t, i18n } = useTranslation()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleRef = useRef<HTMLTextAreaElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [title, setTitle] = useState('')
    const [showPreview, setShowPreview] = useState(false)

    // 判断是否为新建的未命名文件
    const isUntitled = fileName.startsWith('Untitled_')

    // 字数统计
    const wordCount = useMemo(() => {
        // 中文字符数 + 英文单词数
        const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
        const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
        return chineseChars + englishWords
    }, [content])
    const isMarkdown = fileExtension === 'md' || fileExtension === '.md'

    // 预览 HTML
    const previewHtml = useMemo(() => {
        if (!showPreview || !isMarkdown) return ''
        return renderMarkdown(content)
    }, [content, showPreview, isMarkdown])

    useEffect(() => {
        // 如果是未命名文件，显示空白让用户输入
        if (isUntitled) {
            setTitle('')
        } else {
            const baseName = fileName.replace(/\.[^/.]+$/, '')
            setTitle(baseName)
        }
    }, [fileName, isUntitled])

    // 切换文件类型时关闭预览
    useEffect(() => {
        if (!isMarkdown) {
            setShowPreview(false)
        }
    }, [isMarkdown])

    // 切换预览/编辑模式时同步滚动位置
    const togglePreview = () => {
        const scrollContainer = scrollRef.current
        if (scrollContainer) {
            // 计算当前滚动位置的百分比
            const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
            const scrollRatio = scrollHeight > 0 ? scrollContainer.scrollTop / scrollHeight : 0

            // 切换预览状态
            setShowPreview(prev => !prev)

            // 在下一帧应用相同的滚动比例
            requestAnimationFrame(() => {
                const newScrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
                scrollContainer.scrollTop = newScrollHeight * scrollRatio
            })
        } else {
            setShowPreview(prev => !prev)
        }
    }

    // 自动调整文本域高度（避免布局抖动）
    useEffect(() => {
        if (titleRef.current) {
            const el = titleRef.current
            // 保存当前滚动位置
            const scrollTop = scrollRef.current?.scrollTop || 0
            // 临时设置高度来测量
            el.style.height = '0'
            el.style.height = `${el.scrollHeight}px`
            // 恢复滚动位置
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollTop
            }
        }
    }, [title])

    useEffect(() => {
        if (textareaRef.current) {
            const el = textareaRef.current
            // 保存当前滚动位置
            const scrollTop = scrollRef.current?.scrollTop || 0
            // 临时设置高度来测量
            el.style.height = '0'
            el.style.height = `${Math.max(el.scrollHeight, 400)}px`  // 保持最小高度
            // 恢复滚动位置
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollTop
            }
        }
    }, [content])

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value)
        // 自动调整高度（避免 auto 导致的抖动）
        e.target.style.height = '0'
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

            // 如果正文为空，自动添加两个全角空格作为首行缩进
            const indent = '　　'  // 两个全角空格（每个相当于一个汉字宽度）
            if (!content.trim() && textareaRef.current) {
                onChange(indent)
                // 将光标移动到末尾
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.focus()
                        textareaRef.current.selectionStart = indent.length
                        textareaRef.current.selectionEnd = indent.length
                    }
                }, 0)
            } else {
                textareaRef.current?.focus()
            }
        }
    }

    // 点击正文区域时，如果为空则自动添加首行缩进
    const handleBodyFocus = () => {
        const indent = '　　'  // 两个全角空格
        if (!content.trim() && textareaRef.current) {
            onChange(indent)
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = indent.length
                    textareaRef.current.selectionEnd = indent.length
                }
            }, 0)
        }
    }

    return (
        <div className="editor-container">
            {/* 顶部工具栏 - 水平对齐 */}
            <div className={`editor-toolbar ${focusMode ? 'focus-mode' : ''}`}>
                {/* 专注模式下隐藏格式按钮 */}
                {!focusMode && (
                    <div className="toolbar-group">
                        {/* MD 预览按钮 - 仅 Markdown 文件显示，放在左侧 */}
                        {isMarkdown && (
                            <button
                                className={`preview-btn ${showPreview ? 'active' : ''}`}
                                onClick={togglePreview}
                                title={showPreview ? '关闭预览' : '预览效果'}
                            >
                                {showPreview ? (
                                    <EyeOff size={14} strokeWidth={1.5} />
                                ) : (
                                    <Eye size={14} strokeWidth={1.5} />
                                )}
                            </button>
                        )}

                        {/* 格式切换拨片 - 一体式设计 */}
                        <div className="format-toggle-switch">
                            <button
                                className={`format-option ${!isMarkdown ? 'active' : ''}`}
                                onClick={isMarkdown ? onFormatToggle : undefined}
                                title={isMarkdown ? '转换为 TXT 副本' : '当前格式'}
                            >
                                TXT
                            </button>
                            <button
                                className={`format-option ${isMarkdown ? 'active' : ''}`}
                                onClick={!isMarkdown ? onFormatToggle : undefined}
                                title={!isMarkdown ? '转换为 MD 副本' : '当前格式'}
                            >
                                MD
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 编辑区域 - 可滚动 */}
            <div className={`editor-scroll ${focusMode ? 'focus-mode-content' : ''}`} ref={scrollRef}>
                <div className="editor-content">
                    {/* 标题 - 自动换行 */}
                    <textarea
                        ref={titleRef}
                        className="editor-title"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        placeholder={t('editor.titlePlaceholder')}
                        rows={1}
                        spellCheck={false}
                        readOnly={showPreview}
                    />

                    {/* 标题与正文分隔线 - 三个圆点装饰 */}
                    <div className="editor-divider">
                        <span className="divider-dot"></span>
                        <span className="divider-dot"></span>
                        <span className="divider-dot"></span>
                    </div>

                    {/* 正文编辑器 - 隐藏但不销毁 */}
                    <textarea
                        ref={textareaRef}
                        className="editor-body"
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={handleBodyFocus}
                        onKeyDown={(e) => {
                            const textarea = textareaRef.current
                            if (!textarea) return

                            // 回车自动缩进：插入换行 + 两个全角空格
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                const indent = '　　' // 两个全角空格（每个相当于一个汉字宽度）
                                const newContent = content.substring(0, start) + '\n' + indent + content.substring(end)
                                onChange(newContent)
                                // 需要在下一个事件循环设置光标位置
                                setTimeout(() => {
                                    textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length
                                }, 0)
                            }

                            // Backspace 取消缩进：如果光标前是换行+缩进，先删除缩进
                            if (e.key === 'Backspace') {
                                const start = textarea.selectionStart
                                const end = textarea.selectionEnd
                                // 只有在没有选中文本时处理
                                if (start === end && start > 0) {
                                    const textBefore = content.substring(0, start)
                                    // 检查是否在缩进空格后面
                                    if (textBefore.endsWith('　　')) {
                                        // 删除两个全角空格
                                        e.preventDefault()
                                        const newContent = content.substring(0, start - 2) + content.substring(end)
                                        onChange(newContent)
                                        setTimeout(() => {
                                            textarea.selectionStart = textarea.selectionEnd = start - 2
                                        }, 0)
                                    } else if (textBefore.endsWith('　')) {
                                        // 只有一个全角空格
                                        e.preventDefault()
                                        const newContent = content.substring(0, start - 1) + content.substring(end)
                                        onChange(newContent)
                                        setTimeout(() => {
                                            textarea.selectionStart = textarea.selectionEnd = start - 1
                                        }, 0)
                                    }
                                }
                            }
                        }}
                        placeholder={t('editor.bodyPlaceholder')}
                        spellCheck={false}
                        style={{ display: showPreview ? 'none' : 'block' }}
                    />

                    {/* 预览区域 - 隐藏但不销毁 */}
                    <div
                        className="editor-preview"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                        style={{ display: showPreview ? 'block' : 'none' }}
                    />

                    {/* 底部分隔线 */}
                    <div className="editor-divider editor-divider-bottom">
                        <span className="divider-dot"></span>
                        <span className="divider-dot"></span>
                        <span className="divider-dot"></span>
                    </div>

                    {/* 文章统计信息 */}
                    <div className="editor-stats">
                        <span className="stat-item">{wordCount} {t('editor.wordCount')}</span>
                        {createdAt && (
                            <span className="stat-item">
                                {t('editor.created')}: {new Date(createdAt).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
                            </span>
                        )}
                        {modifiedAt && (
                            <span className="stat-item">
                                {t('editor.modified')}: {new Date(modifiedAt).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Editor
