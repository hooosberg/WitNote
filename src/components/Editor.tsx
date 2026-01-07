/**
 * 编辑器组件
 * 修复：标题默认空白+灰色占位符、标题自动换行、自适应高度
 * 新增：MD 预览功能、回车自动缩进
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { marked } from 'marked'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { FloatingToolbar } from './FloatingToolbar'
import { BlockInsertMenu } from './BlockInsertMenu'
import { AutocompletePopup } from './AutocompletePopup'
import { useAutocomplete } from '../hooks/useAutocomplete'
import { UseEngineStoreReturn } from '../store/engineStore'
import { useEngineStore } from '../store/engineStore'
import { useSettings } from '../hooks/useSettings'

interface EditorProps {
    content: string
    onChange: (content: string) => void
    fileName: string
    fileExtension: string
    filePath?: string  // 当前文件路径，用于图片保存
    vaultPath?: string  // Vault 根目录路径，用于图片预览
    onTitleChange?: (newName: string) => void
    onFormatToggle?: () => void
    focusMode?: boolean
    createdAt?: number
    modifiedAt?: number
    previewMode: 'edit' | 'preview' | 'split'
    onPreviewModeChange?: (mode: 'edit' | 'preview' | 'split') => void
    /** 共享的引擎状态（自动续写用），若不传则内部创建独立实例 */
    engineStore?: UseEngineStoreReturn
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

/**
 * 将预览 HTML 中的相对路径图片转换为 file:// URL
 * @param html - 渲染后的 HTML
 * @param vaultPath - vault 根目录绝对路径
 * @param filePath - 当前文件的相对路径
 */
const resolveImagePaths = (html: string, vaultPath: string, filePath: string): string => {
    if (!vaultPath || !filePath) {
        console.log('resolveImagePaths: 跳过 - vaultPath 或 filePath 为空')
        return html
    }

    // 获取当前文件所在目录的绝对路径
    const fileDir = filePath.includes('/')
        ? filePath.substring(0, filePath.lastIndexOf('/'))
        : ''
    const basePath = fileDir ? `${vaultPath}/${fileDir}` : vaultPath

    console.log('resolveImagePaths 调试:')
    console.log('  - vaultPath:', vaultPath)
    console.log('  - filePath:', filePath)
    console.log('  - fileDir:', fileDir)
    console.log('  - basePath:', basePath)

    // 替换 img 标签中的相对路径 src
    // 匹配 <img src="相对路径" 形式
    return html.replace(
        /<img\s+([^>]*)src="([^"]+)"([^>]*)>/gi,
        (_match, before, src, after) => {
            console.log('  - 找到图片:', src)
            // 跳过已经是绝对路径或 URL 的情况
            if (src.startsWith('http://') || src.startsWith('https://') ||
                src.startsWith('file://') || src.startsWith('local-file://') || src.startsWith('data:')) {
                console.log('    - 跳过（已是绝对路径）')
                return _match
            }
            // 将相对路径转换为 local-file:// URL（使用 Electron 注册的自定义协议）
            const absolutePath = `${basePath}/${src}`.replace(/\/+/g, '/')
            const fileUrl = `local-file://${absolutePath}`
            console.log('    - 转换为:', fileUrl)
            return `<img ${before}src="${fileUrl}"${after}>`
        }
    )
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    fileName,
    fileExtension,
    filePath,
    vaultPath,
    onTitleChange,
    onFormatToggle: _,
    focusMode = false,
    createdAt,
    modifiedAt,
    previewMode,
    onPreviewModeChange,
    engineStore: externalEngineStore
}) => {
    const { t, i18n } = useTranslation()
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const titleRef = useRef<HTMLTextAreaElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // 智能联想功能
    // 优先使用外部传入的 engineStore（确保与 ChatPanel 同步），否则回退到内部创建
    // 当外部传入 store 时，内部 hook 仅用于作为 fallback，且不应触发副作用
    const internalEngineStore = useEngineStore({ enableAutoInit: !externalEngineStore })
    const engineStore = externalEngineStore || internalEngineStore
    const { settings } = useSettings()

    // 获取本地化的默认提示词
    const defaultSystemPrompt = t('autocomplete.promptStandard')
    // 如果用户没有自定义提示词，使用本地化的默认提示词
    const effectivePrompt = settings.autocompletePrompt || defaultSystemPrompt

    const autocomplete = useAutocomplete(engineStore, {
        debounceMs: settings.autocompleteDelay,
        maxContextLength: settings.autocompleteContextLength || 500,
        maxTokens: 50,
        enabled: settings.autocompleteEnabled && (previewMode === 'edit' || previewMode === 'split'),
        // 当角色关联开启时，将角色设定附加到续写提示词中
        customPrompt: settings.autocompleteUseRolePrompt && settings.systemPrompt
            ? `${effectivePrompt}\n\n写作风格参考：${settings.systemPrompt}`.trim()
            : effectivePrompt
    })
    // 分屏模式滚动联动 ref
    const splitLeftRef = useRef<HTMLDivElement>(null)
    const splitRightRef = useRef<HTMLDivElement>(null)
    const isScrollingSyncRef = useRef(false) // 防止循环触发

    const [title, setTitle] = useState('')
    const showPreview = previewMode !== 'edit' // 兼容现有代码

    // 分屏比例状态 (默认 50%)
    const [splitRatio, setSplitRatio] = useState(0.5)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isDraggingSplit, setIsDraggingSplit] = useState(false)

    // 分屏拖动处理 (参考 App.tsx 实现)
    const handleSplitResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingSplit(true)

        const startX = e.clientX
        const startRatio = splitRatio
        const container = (e.currentTarget as HTMLElement).parentElement

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!container) return
            const rect = container.getBoundingClientRect()
            const deltaX = moveEvent.clientX - startX
            // 计算比例变化
            const deltaRatio = deltaX / rect.width
            // 限制比例在 20% - 80% 之间
            const newRatio = Math.max(0.2, Math.min(0.8, startRatio + deltaRatio))
            setSplitRatio(newRatio)
        }

        const handleMouseUp = () => {
            setIsDraggingSplit(false)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [splitRatio])

    // 分屏滚动联动处理 - 按比例同步滚动位置
    const handleSplitScroll = useCallback((source: 'left' | 'right') => {
        // 防止循环触发
        if (isScrollingSyncRef.current) return

        isScrollingSyncRef.current = true
        const sourceRef = source === 'left' ? splitLeftRef : splitRightRef
        const targetRef = source === 'left' ? splitRightRef : splitLeftRef

        if (sourceRef.current && targetRef.current) {
            // 计算源容器的滚动比例（0-1）
            const sourceScrollableHeight = sourceRef.current.scrollHeight - sourceRef.current.clientHeight
            const scrollRatio = sourceScrollableHeight > 0
                ? sourceRef.current.scrollTop / sourceScrollableHeight
                : 0

            // 应用相同比例到目标容器
            const targetScrollableHeight = targetRef.current.scrollHeight - targetRef.current.clientHeight
            const targetScrollTop = targetScrollableHeight * scrollRatio

            // 只在目标位置有明显差异时才同步，避免微小抖动
            if (Math.abs(targetRef.current.scrollTop - targetScrollTop) > 1) {
                targetRef.current.scrollTop = targetScrollTop
            }
        }

        // 延迟重置标志（使用 setTimeout 比 requestAnimationFrame 更稳定）
        setTimeout(() => {
            isScrollingSyncRef.current = false
        }, 16) // 约一帧的时间
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
        let html = renderMarkdown(content)
        // 将相对路径图片转换为 file:// URL 以便在预览中显示
        if (vaultPath && filePath) {
            html = resolveImagePaths(html, vaultPath, filePath)
        }
        return html
    }, [content, showPreview, isMarkdown, vaultPath, filePath])

    useEffect(() => {
        // 如果是未命名文件，显示空白让用户输入
        if (isUntitled) {
            setTitle('')
        } else {
            const baseName = fileName.replace(/\.[^/.]+$/, '')
            setTitle(baseName)
        }
    }, [fileName, isUntitled])

    // 切换文件类型时关闭预览（父组件处理）
    // useEffect(() => {
    //     if (!isMarkdown) {
    //         setPreviewMode('edit')
    //     }
    // }, [isMarkdown])



    // 图片粘贴处理
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea || !isMarkdown || !filePath) return

        // 辅助函数：判断是否为图片 URL
        const isImageUrl = (url: string): boolean => {
            try {
                const u = new URL(url)
                // 检查常见图片扩展名
                if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(u.pathname)) {
                    return true
                }
                // 检查常见图床域名
                const imageHosts = ['imgur.com', 'i.imgur.com', 'unsplash.com', 'images.unsplash.com',
                    'picsum.photos', 'placekitten.com', 'via.placeholder.com',
                    'raw.githubusercontent.com', 'cdn.jsdelivr.net']
                if (imageHosts.some(host => u.hostname.includes(host))) {
                    return true
                }
                return false
            } catch {
                return false
            }
        }

        // 辅助函数：插入图片 Markdown
        const insertImageMarkdown = (imagePath: string) => {
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

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            // 获取文件所在目录
            const dirPath = filePath.includes('/')
                ? filePath.substring(0, filePath.lastIndexOf('/'))
                : ''

            // 1. 首先检查是否有图片 blob（优先处理）
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

                            // 保存图片到本地
                            const imagePath = await window.fs.saveImage(dirPath, base64Data)
                            insertImageMarkdown(imagePath)
                        }
                        reader.readAsDataURL(file)
                    } catch (error) {
                        console.error('粘贴图片失败:', error)
                    }
                    return // 已处理图片 blob，退出
                }
            }

            // 2. 检查粘贴的文本是否为图片 URL
            const text = e.clipboardData?.getData('text/plain')?.trim()
            if (text && isImageUrl(text)) {
                e.preventDefault()
                console.log('📥 检测到图片 URL:', text)

                try {
                    const imagePath = await window.fs.downloadAndSaveImage(text, dirPath)
                    if (imagePath) {
                        insertImageMarkdown(imagePath)
                        console.log('✅ 网络图片已本地化:', imagePath)
                    }
                } catch (error) {
                    console.error('下载网络图片失败:', error)
                    // 下载失败时，插入原始 URL 作为图片链接
                    insertImageMarkdown(text)
                }
            }
        }

        textarea.addEventListener('paste', handlePaste)
        return () => textarea.removeEventListener('paste', handlePaste)
    }, [textareaRef, isMarkdown, filePath, content, onChange])

    // 自动调整标题高度（避免布局抖动）
    // 添加 previewMode 依赖：分屏模式宽度变化需要重新计算高度
    useEffect(() => {
        const adjustTitleHeight = () => {
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
        }

        // 立即执行一次
        adjustTitleHeight()

        // 模式切换时延迟再执行一次，确保布局完成
        if (previewMode === 'split') {
            const timer = setTimeout(adjustTitleHeight, 50)
            return () => clearTimeout(timer)
        }
    }, [title, previewMode])

    useEffect(() => {
        if (textareaRef.current) {
            const el = textareaRef.current
            // 只在元素可见时调整高度
            if (el.offsetParent === null) return  // 元素不可见

            // 确定当前的滚动容器
            const scrollContainer = previewMode === 'split' ? splitLeftRef.current : scrollRef.current
            // 保存当前滚动位置
            const scrollTop = scrollContainer?.scrollTop || 0

            // 临时设置高度来测量
            el.style.height = '0'
            el.style.height = `${Math.max(el.scrollHeight, 400)}px`  // 保持最小高度

            // 恢复滚动位置
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollTop
            }
        }
    }, [content, previewMode])  // 添加 previewMode 依赖，模式切换时重新计算高度

    // 模式切换后延迟重新计算高度（确保 DOM 完全更新）
    useEffect(() => {
        if (previewMode === 'edit' || previewMode === 'split') {
            const timer = setTimeout(() => {
                if (textareaRef.current && textareaRef.current.offsetParent !== null) {
                    const el = textareaRef.current
                    el.style.height = '0'
                    el.style.height = `${Math.max(el.scrollHeight, 400)}px`
                }
            }, 50)  // 延迟 50ms 确保 DOM 更新完成
            return () => clearTimeout(timer)
        }
    }, [previewMode])

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value)
        // 自动调整高度（避免 auto 导致的抖动）
        e.target.style.height = '0'
        e.target.style.height = `${e.target.scrollHeight}px`
    }

    const handleTitleBlur = () => {
        if (onTitleChange) {
            const ext = fileExtension.startsWith('.') ? fileExtension.slice(1) : fileExtension
            let newTitle = title.trim()

            // 如果用户没有输入标题且文件仍是 Untitled_xxx 格式，不触发重命名
            // 这避免了新建文件时标题框失焦就立即改名导致的状态问题
            if (!newTitle && isUntitled) {
                return  // 保持 Untitled_xxx 格式，等用户真正输入标题时再重命名
            }

            // 如果用户没有输入标题（但文件不是 Untitled 格式），使用当前时间作为默认标题
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

    // 处理外部文件拖拽，确保事件冒泡到 App.tsx
    const handleExternalDrag = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
        }
    }

    return (
        <div
            className="editor-container"
            onDragOver={handleExternalDrag}
            onDrop={handleExternalDrag}
        >
            {/* 顶部工具栏已移除，功能移动到 TopBar */}

            {/* 编辑区域 - 可滚动，支持分屏模式 */}
            <div className={`editor-scroll ${focusMode ? 'focus-mode-content' : ''} ${previewMode === 'split' ? 'split-mode' : ''}`} ref={scrollRef}>
                {/* 分屏模式：左编辑右预览 */}
                {previewMode === 'split' ? (
                    <div className="editor-split-container">
                        {/* 左侧编辑区 */}
                        <div
                            ref={splitLeftRef}
                            className="editor-split-pane editor-split-left"
                            style={{ flex: `0 0 ${splitRatio * 100}%` }}
                            onScroll={() => handleSplitScroll('left')}
                        >
                            <div className="topbar-spacer" />
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

                                {/* 智能联想弹出框与文本框包装 */}
                                <div style={{ position: 'relative' }}>
                                    <AutocompletePopup
                                        textareaRef={textareaRef}
                                        content={autocomplete.lastContent || content}
                                        cursorPosition={autocomplete.cursorPosition}
                                        suggestion={autocomplete.suggestion}
                                        isLoading={autocomplete.isLoading}
                                    />

                                    <textarea
                                        ref={textareaRef}
                                        className={`editor-body ${autocomplete.suggestion && !autocomplete.isLoading ? 'ghost-active' : ''}`}
                                        value={content}
                                        onChange={(e) => {
                                            onChange(e.target.value)
                                            // 触发联想
                                            autocomplete.handleInput(e.target.value, e.target.selectionStart)
                                        }}
                                        onClick={(e) => {
                                            // 1. 点击任意位置，先取消当前的联想
                                            autocomplete.dismissSuggestion()

                                            // 2. 检查是否在段落末尾，若是则重新触发
                                            const target = e.target as HTMLTextAreaElement
                                            autocomplete.handleCursorChange(target.value, target.selectionStart)
                                        }}
                                        onKeyDown={(e) => {
                                            // Tab 键接受联想建议
                                            if (e.key === 'Tab' && autocomplete.suggestion) {
                                                e.preventDefault()
                                                const result = autocomplete.acceptSuggestion()
                                                if (result && textareaRef.current) {
                                                    const { text, hasRemaining } = result
                                                    // 保存当前滚动容器的滚动位置
                                                    const scrollContainer = previewMode === 'split' ? splitLeftRef.current : scrollRef.current
                                                    const currentScrollTop = scrollContainer?.scrollTop || 0

                                                    const cursorPos = textareaRef.current.selectionStart
                                                    const newContent = content.slice(0, cursorPos) + text + content.slice(cursorPos)
                                                    onChange(newContent)
                                                    // 移动光标到建议末尾
                                                    const newPos = cursorPos + text.length
                                                    setTimeout(() => {
                                                        if (textareaRef.current) {
                                                            // 确保光标位置正确
                                                            textareaRef.current.focus()
                                                            textareaRef.current.setSelectionRange(newPos, newPos)

                                                            // 恢复正确容器的滚动位置
                                                            if (scrollContainer) {
                                                                scrollContainer.scrollTop = currentScrollTop
                                                            }

                                                            if (hasRemaining) {
                                                                // 如果还有剩余建议，只更新上下文状态，不重新触发生成
                                                                autocomplete.updateContext(newContent, newPos)
                                                            } else {
                                                                // 全部接受完，触发连续续写
                                                                autocomplete.triggerContinuation(newContent, newPos)
                                                            }
                                                        }
                                                    }, 0)
                                                }
                                                return
                                            }
                                            // Esc 键取消联想
                                            if (e.key === 'Escape' && autocomplete.suggestion) {
                                                autocomplete.dismissSuggestion()
                                                return
                                            }
                                        }}
                                        onFocus={handleBodyFocus}
                                        placeholder={t('editor.bodyPlaceholder')}
                                        spellCheck={false}
                                    />
                                </div>

                                {/* 底部分隔线和统计 */}
                                <div className="editor-divider editor-divider-bottom">
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                    <span className="divider-dot"></span>
                                </div>

                                <div className="editor-stats">
                                    <span className="stat-item">{wordCount} {t('editor.wordCount')}</span>
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

                        {/* 分隔线 */}
                        <div
                            className={`resizable-divider ${isDraggingSplit ? 'dragging' : ''}`}
                            onMouseDown={handleSplitResize}
                            onDoubleClick={() => {
                                // 双击中间调节杆：变为单屏模式
                                // 如果是 Markdown，变为编辑模式；如果是不可编辑（如图片），变为预览模式（即单屏查看）
                                if (isMarkdown) {
                                    onPreviewModeChange?.('edit')
                                } else {
                                    onPreviewModeChange?.('preview')
                                }
                            }}
                            style={{ cursor: 'col-resize', width: '8px', flexShrink: 0, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <div className="divider-handle" />
                        </div>

                        {/* 右侧预览区 */}
                        <div
                            ref={splitRightRef}
                            className="editor-split-pane editor-split-right"
                            style={{ flex: 1 }}
                            onScroll={() => handleSplitScroll('right')}
                        >
                            <div className="topbar-spacer" />
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
                    <>
                        <div className="topbar-spacer" />
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

                            {/* 智能联想弹出框与文本框包装 */}
                            <div style={{ position: 'relative', display: showPreview ? 'none' : 'block' }}>
                                {!showPreview && (
                                    <AutocompletePopup
                                        textareaRef={textareaRef}
                                        content={autocomplete.lastContent || content}
                                        cursorPosition={autocomplete.cursorPosition}
                                        suggestion={autocomplete.suggestion}
                                        isLoading={autocomplete.isLoading}
                                    />
                                )}

                                <textarea
                                    ref={textareaRef}
                                    className={`editor-body ${autocomplete.suggestion && !autocomplete.isLoading ? 'ghost-active' : ''}`}
                                    value={content}
                                    onChange={(e) => {
                                        onChange(e.target.value)
                                        // 触发联想
                                        autocomplete.handleInput(e.target.value, e.target.selectionStart)
                                    }}
                                    onClick={(e) => {
                                        // 1. 点击任意位置，先取消当前的联想
                                        autocomplete.dismissSuggestion()

                                        // 2. 检查是否在段落末尾，若是则重新触发
                                        const target = e.target as HTMLTextAreaElement
                                        autocomplete.handleCursorChange(target.value, target.selectionStart)
                                    }}
                                    onKeyDown={(e) => {
                                        // Tab 键接受联想建议
                                        if (e.key === 'Tab' && autocomplete.suggestion) {
                                            e.preventDefault()
                                            const result = autocomplete.acceptSuggestion()
                                            if (result && textareaRef.current) {
                                                const { text, hasRemaining } = result
                                                // 保存当前滚动位置
                                                const scrollTop = textareaRef.current.scrollTop
                                                const cursorPos = textareaRef.current.selectionStart
                                                const newContent = content.slice(0, cursorPos) + text + content.slice(cursorPos)
                                                onChange(newContent)
                                                // 移动光标到建议末尾
                                                const newPos = cursorPos + text.length
                                                setTimeout(() => {
                                                    if (textareaRef.current) {
                                                        // 恢复滚动位置
                                                        textareaRef.current.scrollTop = scrollTop
                                                        textareaRef.current.setSelectionRange(newPos, newPos)
                                                        // 确保光标可见
                                                        textareaRef.current.blur()
                                                        textareaRef.current.focus()
                                                        textareaRef.current.scrollTop = scrollTop

                                                        if (hasRemaining) {
                                                            autocomplete.updateContext(newContent, newPos)
                                                        } else {
                                                            autocomplete.triggerContinuation(newContent, newPos)
                                                        }
                                                    }
                                                }, 0)
                                            }
                                            return
                                        }
                                        // Esc 键取消联想
                                        if (e.key === 'Escape' && autocomplete.suggestion) {
                                            autocomplete.dismissSuggestion()
                                            return
                                        }
                                    }}
                                    placeholder={t('editor.bodyPlaceholder')}
                                    spellCheck={false}
                                />
                            </div>

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
                    </>
                )}
            </div>
        </div>
    )
}

export default Editor
