/**
 * 浮动工具栏 - 最简版
 * 选中文字时显示，提供 Markdown 格式化和 AI 编辑功能
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bold, Italic, Link, Heading1, Heading2, Quote, Sparkles } from 'lucide-react'
import getCaretCoordinates from 'textarea-caret'
import { useTranslation } from 'react-i18next'
import AIDialog from './AIDialog'
import { aiProcessText } from '../services/inlineAiEdit'
import { UseEngineStoreReturn } from '../store/engineStore'

interface FloatingToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>
    content: string
    onChange: (content: string) => void
    editorScrollRef: React.RefObject<HTMLDivElement>
    engineStore: UseEngineStoreReturn
}

interface ToolbarPosition {
    top: number
    left: number
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
    textareaRef,
    content,
    onChange,
    engineStore
}) => {
    const { t } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 })
    const [selection, setSelection] = useState({ start: 0, end: 0 })
    const [showLinkInput, setShowLinkInput] = useState(false)
    const [linkUrl, setLinkUrl] = useState('https://')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isAiLoading, setIsAiLoading] = useState(false)
    const [isAiRegenerating, setIsAiRegenerating] = useState(false)
    const [previewData, setPreviewData] = useState<{ original: string; new: string } | null>(null)
    const [resultType, setResultType] = useState<'edit' | 'ask' | null>(null)
    const lastInstructionRef = useRef('')

    const getCaretPosition = useCallback((pos: number): { top: number; left: number; height: number } | null => {
        const textarea = textareaRef.current
        if (!textarea) return null
        const coords = getCaretCoordinates(textarea, pos)
        return { top: coords.top - textarea.scrollTop, left: coords.left, height: coords.height }
    }, [textareaRef])

    const calculatePosition = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return null
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (start === end) return null

        const startPos = getCaretPosition(start)
        const endPos = getCaretPosition(end)
        if (!startPos || !endPos) return null

        const textareaRect = textarea.getBoundingClientRect()
        const toolbarWidth = 280
        const toolbarHeight = 44
        const horizontalOffset = 37

        const style = window.getComputedStyle(textarea)
        const pl = parseFloat(style.paddingLeft) || 0
        const pt = parseFloat(style.paddingTop) || 0
        const bl = parseFloat(style.borderLeftWidth) || 0
        const bt = parseFloat(style.borderTopWidth) || 0

        const top = (textareaRect.top + pt + bt + startPos.top) - toolbarHeight - 8

        let centerX: number
        if (startPos.top === endPos.top) {
            const sx = textareaRect.left + pl + bl + startPos.left
            const ex = textareaRect.left + pl + bl + endPos.left
            centerX = (sx + ex) / 2
        } else {
            centerX = (textareaRect.left + pl + bl + startPos.left) + (toolbarWidth / 2)
        }

        let left = centerX - (toolbarWidth / 2) + horizontalOffset
        left = Math.max(10, Math.min(left, window.innerWidth - toolbarWidth - 10))

        return { top: Math.max(10, top), left }
    }, [textareaRef, getCaretPosition])

    const checkAndUpdateToolbar = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (start !== end && content.substring(start, end).trim() !== '') {
            const pos = calculatePosition()
            if (pos) { setPosition(pos); setSelection({ start, end }); setIsVisible(true) }
        } else {
            setIsVisible(false)
        }
    }, [textareaRef, content, calculatePosition])

    // 监听选区变化
    useEffect(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        const handler = () => { if (!isDialogOpen) checkAndUpdateToolbar() }
        textarea.addEventListener('mouseup', handler)
        textarea.addEventListener('keyup', handler)
        document.addEventListener('selectionchange', handler)
        return () => {
            textarea.removeEventListener('mouseup', handler)
            textarea.removeEventListener('keyup', handler)
            document.removeEventListener('selectionchange', handler)
        }
    }, [textareaRef, checkAndUpdateToolbar, isDialogOpen])

    // 点击外部隐藏工具栏
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const toolbar = document.querySelector('.floating-toolbar')
            if (toolbar && !toolbar.contains(e.target as Node)) {
                setTimeout(() => {
                    const ta = textareaRef.current
                    if (ta && ta.selectionStart === ta.selectionEnd) setIsVisible(false)
                }, 100)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [textareaRef])

    const applyFormat = useCallback((prefix: string, suffix: string, isBlock = false) => {
        const textarea = textareaRef.current
        if (!textarea) return
        const { start, end } = selection
        const selectedText = content.substring(start, end)

        let newContent: string
        let newCursorPos: number

        if (isBlock) {
            const before = content.substring(0, start)
            const after = content.substring(end)
            const lineStart = before.lastIndexOf('\n') + 1
            const lineEnd = after.indexOf('\n')
            const fullLineEnd = lineEnd === -1 ? content.length : end + lineEnd
            const lineBefore = content.substring(0, lineStart)
            const lineAfter = content.substring(fullLineEnd)
            const lineContent = content.substring(lineStart, fullLineEnd)
            if (lineContent.startsWith(prefix)) {
                newContent = lineBefore + lineContent.substring(prefix.length) + lineAfter
                newCursorPos = start - prefix.length
            } else {
                newContent = lineBefore + prefix + lineContent + lineAfter
                newCursorPos = start + prefix.length
            }
        } else {
            const before = content.substring(0, start)
            const after = content.substring(end)
            const hasOuter = before.endsWith(prefix) && after.startsWith(suffix)
            const hasInner = selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length
            if (hasOuter) {
                newContent = before.slice(0, -prefix.length) + selectedText + after.slice(suffix.length)
                newCursorPos = start - prefix.length
            } else if (hasInner) {
                const inner = selectedText.slice(prefix.length, -suffix.length)
                newContent = before + inner + after
                newCursorPos = start + inner.length
            } else {
                newContent = before + prefix + selectedText + suffix + after
                newCursorPos = end + prefix.length + suffix.length
            }
        }

        onChange(newContent)
        setIsVisible(false)
        setTimeout(() => {
            const ta = textareaRef.current
            if (!ta) return
            const st = ta.scrollTop
            ta.setSelectionRange(newCursorPos, newCursorPos)
            ta.scrollTop = st
        }, 0)
    }, [textareaRef, content, selection, onChange])

    const addLink = useCallback(() => { setShowLinkInput(true); setLinkUrl('https://') }, [])
    const confirmLink = useCallback(() => {
        const ta = textareaRef.current
        if (!ta) return
        const { start, end } = selection
        if (linkUrl && linkUrl !== 'https://') {
            const linkText = `[${content.substring(start, end)}](${linkUrl})`
            onChange(content.substring(0, start) + linkText + content.substring(end))
            setIsVisible(false)
            setShowLinkInput(false)
            setTimeout(() => {
                const t = textareaRef.current
                if (!t) return
                const st = t.scrollTop
                t.setSelectionRange(start + linkText.length, start + linkText.length)
                t.scrollTop = st
            }, 0)
        }
    }, [textareaRef, content, selection, onChange, linkUrl])
    const cancelLink = useCallback(() => { setShowLinkInput(false); setLinkUrl('https://') }, [])
    const handleLinkKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmLink() }
        else if (e.key === 'Escape') cancelLink()
    }, [confirmLink, cancelLink])

    return (
        <>
            {isVisible && createPortal(
                <div className="floating-toolbar" style={{ top: `${position.top}px`, left: `${position.left}px` }}>
                    {showLinkInput ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                                onKeyDown={handleLinkKeyDown} placeholder="https://" autoFocus
                                style={{ width: '180px', padding: '4px 8px', fontSize: '12px', border: 'none', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
                            <button className="floating-toolbar-btn" onClick={confirmLink} title={t('toolbar.confirm')} style={{ color: '#30d158' }}>✓</button>
                            <button className="floating-toolbar-btn" onClick={cancelLink} title={t('toolbar.cancel')} style={{ color: '#ff453a' }}>✕</button>
                        </div>
                    ) : (
                        <>
                            <button className="floating-toolbar-btn" onClick={() => {
                                setIsDialogOpen(true)
                            }} title="AI 编辑" style={{ color: '#a855f7' }}>
                                <Sparkles size={14} strokeWidth={2} />
                            </button>
                            <button className="floating-toolbar-btn" onClick={() => applyFormat('**', '**')} title={t('toolbar.bold')}>
                                <Bold size={14} strokeWidth={2.5} />
                            </button>
                            <button className="floating-toolbar-btn" onClick={() => applyFormat('*', '*')} title={t('toolbar.italic')}>
                                <Italic size={14} strokeWidth={2} />
                            </button>
                            <button className="floating-toolbar-btn" onClick={addLink} title={t('toolbar.link')}>
                                <Link size={14} strokeWidth={2} />
                            </button>
                            <div className="floating-toolbar-divider" />
                            <button className="floating-toolbar-btn" onClick={() => applyFormat('# ', '', true)} title={t('toolbar.heading1')}>
                                <Heading1 size={14} strokeWidth={2} />
                            </button>
                            <button className="floating-toolbar-btn" onClick={() => applyFormat('## ', '', true)} title={t('toolbar.heading2')}>
                                <Heading2 size={14} strokeWidth={2} />
                            </button>
                            <button className="floating-toolbar-btn" onClick={() => applyFormat('> ', '', true)} title={t('toolbar.quote')}>
                                <Quote size={14} strokeWidth={2} />
                            </button>
                        </>
                    )}
                </div>,
                document.body
            )}
            <AIDialog
                isOpen={isDialogOpen}
                isLoading={isAiLoading}
                isRegenerating={isAiRegenerating}
                previewData={previewData}
                selectedText={content.substring(selection.start, selection.end)}
                onConfirmPreview={() => {
                    const { start, end } = selection
                    const newContent = content.substring(0, start) + previewData!.new + content.substring(end)
                    onChange(newContent)
                    setPreviewData(null)
                    setIsDialogOpen(false)
                    setIsVisible(false)
                }}
                onCancelPreview={() => {
                    setPreviewData(null)
                }}
                onClose={() => {
                    if (!isAiLoading && !isAiRegenerating) {
                        setIsDialogOpen(false)
                        setPreviewData(null)
                        setResultType(null)
                        requestAnimationFrame(() => {
                            textareaRef.current?.focus()
                        })
                    }
                }}
                resultType={resultType}
                onSubmit={async (instruction) => {
                    const { start, end } = selection
                    const selectedText = content.substring(start, end)
                    lastInstructionRef.current = instruction
                    setIsAiLoading(true)
                    try {
                        const result = await aiProcessText(instruction, selectedText, engineStore)
                        setResultType(result.type)
                        setPreviewData({ original: selectedText, new: result.content })
                    } catch (error) {
                        console.error('AI 处理失败:', error)
                        alert('AI 处理失败: ' + (error instanceof Error ? error.message : String(error)))
                    } finally {
                        setIsAiLoading(false)
                    }
                }}
                onRegenerate={async () => {
                    const { start, end } = selection
                    const selectedText = content.substring(start, end)
                    const instruction = lastInstructionRef.current
                    if (!instruction) return
                    setIsAiRegenerating(true)
                    try {
                        const result = await aiProcessText(instruction, selectedText, engineStore)
                        setPreviewData({ original: selectedText, new: result.content })
                    } catch (error) {
                        console.error('重新生成失败:', error)
                        alert('重新生成失败: ' + (error instanceof Error ? error.message : String(error)))
                    } finally {
                        setIsAiRegenerating(false)
                    }
                }}
            />
        </>
    )
}

export default FloatingToolbar
