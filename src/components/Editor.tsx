/**
 * 编辑器组件
 * 修复：标题默认空白+灰色占位符、标题自动换行、自适应高度
 * 新增：MD 预览功能、回车自动缩进
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Columns2 } from 'lucide-react'
import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { FloatingToolbar } from './FloatingToolbar'
import { BlockInsertMenu } from './BlockInsertMenu'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    fileName: string
    fileExtension: string
    filePath?: string  // 当前文件路径，用于图片保存
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
    filePath,
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
    // 分屏模式滚动联动 ref
    const splitLeftRef = useRef<HTMLDivElement>(null)
    const splitRightRef = useRef<HTMLDivElement>(null)
    const isScrollingSyncRef = useRef(false) // 防止循环触发

    const [title, setTitle] = useState('')
    // 三态预览模式: 'edit' | 'preview' | 'split'
    const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('edit')
    const showPreview = previewMode !== 'edit' // 兼容现有代码

    // 分屏滚动联动处理
    const handleSplitScroll = useCallback((source: 'left' | 'right') => {
        if (isScrollingSyncRef.current) return

        isScrollingSyncRef.current = true
        const sourceRef = source === 'left' ? splitLeftRef : splitRightRef
        const targetRef = source === 'left' ? splitRightRef : splitLeftRef

        if (sourceRef.current && targetRef.current) {
            const sourceScrollHeight = sourceRef.current.scrollHeight - sourceRef.current.clientHeight
            const scrollRatio = sourceScrollHeight > 0 ? sourceRef.current.scrollTop / sourceScrollHeight : 0
            const targetScrollHeight = targetRef.current.scrollHeight - targetRef.current.clientHeight
            targetRef.current.scrollTop = targetScrollHeight * scrollRatio
        }

        // 延迟重置标志，防止连续触发
        requestAnimationFrame(() => {
            isScrollingSyncRef.current = false
        })
    }, [])

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
            setPreviewMode('edit')
        }
    }, [isMarkdown])

    // 三态切换：编辑 → 预览 → 分屏 → 编辑
    const togglePreview = () => {
        const scrollContainer = scrollRef.current
        if (scrollContainer) {
            // 计算当前滚动位置的百分比
            const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
            const scrollRatio = scrollHeight > 0 ? scrollContainer.scrollTop / scrollHeight : 0

            // 三态切换
            setPreviewMode(prev => {
                if (prev === 'edit') return 'preview'
                if (prev === 'preview') return 'split'
                return 'edit'
            })

            // 在下一帧应用相同的滚动比例
            requestAnimationFrame(() => {
                const newScrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
                scrollContainer.scrollTop = newScrollHeight * scrollRatio
            })
        } else {
            setPreviewMode(prev => {
                if (prev === 'edit') return 'preview'
                if (prev === 'preview') return 'split'
                return 'edit'
            })
        }
    }

    // 图片粘贴处理
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea || !isMarkdown || !filePath) return

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault()

                    const file = item.getAsFile()
                    if (!file) continue

                    try {
                        // 读取图片为 base64
                        const reader = new FileReader()
                        reader.onload = async (event) => {
                            const base64Data = event.target?.result as string
                            if (!base64Data) return

                            // 获取文件所在目录
                            const dirPath = filePath.includes('/')
                                ? filePath.substring(0, filePath.lastIndexOf('/'))
                                : ''

                            // 保存图片到本地
                            const imagePath = await window.fs.saveImage(dirPath, base64Data)

                            // 插入 Markdown 图片语法
                            const pos = textarea.selectionStart
                            const beforeCursor = content.substring(0, pos)
                            const afterCursor = content.substring(pos)
                            const imageMarkdown = `![](${imagePath})`

                            onChange(beforeCursor + imageMarkdown + afterCursor)

                            // 移动光标到图片后
                            setTimeout(() => {
                                const newPos = pos + imageMarkdown.length
                                textarea.setSelectionRange(newPos, newPos)
                                textarea.focus()
                            }, 0)
                        }
                        reader.readAsDataURL(file)
                    } catch (error) {
                        console.error('粘贴图片失败:', error)
                    }
                    break
                }
            }
        }

        textarea.addEventListener('paste', handlePaste)
        return () => textarea.removeEventListener('paste', handlePaste)
    }, [textareaRef, isMarkdown, filePath, content, onChange])

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
            textareaRef.current?.focus()
        }
    }

    // 点击正文区域时，不再自动添加首行缩进
    const handleBodyFocus = () => {
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
                                className={`preview-btn ${previewMode !== 'edit' ? 'active' : ''}`}
                                onClick={togglePreview}
                                title={
                                    previewMode === 'edit' ? '预览效果' :
                                        previewMode === 'preview' ? '分屏模式' : '关闭预览'
                                }
                            >
                                {previewMode === 'edit' ? (
                                    <Eye size={14} strokeWidth={1.5} />
                                ) : previewMode === 'preview' ? (
                                    <Columns2 size={14} strokeWidth={1.5} />
                                ) : (
                                    <EyeOff size={14} strokeWidth={1.5} />
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

            {/* 编辑区域 - 可滚动，支持分屏模式 */}
            <div className={`editor-scroll ${focusMode ? 'focus-mode-content' : ''} ${previewMode === 'split' ? 'split-mode' : ''}`} ref={scrollRef}>
                {/* 分屏模式：左编辑右预览 */}
                {previewMode === 'split' ? (
                    <div className="editor-split-container">
                        {/* 左侧编辑区 */}
                        <div
                            ref={splitLeftRef}
                            className="editor-split-pane editor-split-left"
                            onScroll={() => handleSplitScroll('left')}
                        >
                            <div className="editor-content">
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
                                />

                                <div className="editor-divider">
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                </div>

                                {/* Medium 风格：空白行加号菜单 */}
                                <BlockInsertMenu
                                    textareaRef={textareaRef}
                                    content={content}
                                    onChange={onChange}
                                    editorScrollRef={scrollRef}
                                    isMarkdown={isMarkdown}
                                    filePath={filePath}
                                />

                                {/* Medium 风格：选中文字浮动工具栏 */}
                                {isMarkdown && (
                                    <FloatingToolbar
                                        textareaRef={textareaRef}
                                        content={content}
                                        onChange={onChange}
                                        editorScrollRef={scrollRef}
                                    />
                                )}

                                <textarea
                                    ref={textareaRef}
                                    className="editor-body"
                                    value={content}
                                    onChange={(e) => onChange(e.target.value)}
                                    onFocus={handleBodyFocus}

                                    placeholder={t('editor.bodyPlaceholder')}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* 右侧预览区 */}
                        <div
                            ref={splitRightRef}
                            className="editor-split-pane editor-split-right"
                            onScroll={() => handleSplitScroll('right')}
                        >
                            <div className="editor-content">
                                <h1 className="editor-title-preview">{title || t('editor.titlePlaceholder')}</h1>
                                <div className="editor-divider">
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                </div>
                                <div
                                    className="editor-preview"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                    style={{ display: 'block' }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 普通模式：编辑或预览 */
                    <div className="editor-content">
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

                        <div className="editor-divider">
                            <span className="divider-dot"></span>
                            <span className="divider-dot"></span>
                            <span className="divider-dot"></span>
                        </div>

                        {/* Medium 风格：空白行加号菜单 */}
                        {!showPreview && (
                            <BlockInsertMenu
                                textareaRef={textareaRef}
                                content={content}
                                onChange={onChange}
                                editorScrollRef={scrollRef}
                                isMarkdown={isMarkdown}
                                filePath={filePath}
                            />
                        )}

                        {/* Medium 风格：选中文字浮动工具栏 */}
                        {!showPreview && isMarkdown && (
                            <FloatingToolbar
                                textareaRef={textareaRef}
                                content={content}
                                onChange={onChange}
                                editorScrollRef={scrollRef}
                            />
                        )}

                        <textarea
                            ref={textareaRef}
                            className="editor-body"
                            value={content}
                            onChange={(e) => onChange(e.target.value)}

                            placeholder={t('editor.bodyPlaceholder')}
                            spellCheck={false}
                            style={{ display: showPreview ? 'none' : 'block' }}
                        />

                        <div
                            className="editor-preview"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                            style={{ display: showPreview ? 'block' : 'none' }}
                        />

                        <div className="editor-divider editor-divider-bottom">
                            <span className="divider-dot"></span>
                            <span className="divider-dot"></span>
                            <span className="divider-dot"></span>
                        </div>

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
                )}
            </div>
        </div>
    )
}

export default Editor
