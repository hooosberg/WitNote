import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ArrowRight, Copy, Check, RefreshCw } from 'lucide-react'
import { marked } from 'marked'

interface AIDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (instruction: string) => void
    onRegenerate?: () => Promise<void>
    isLoading?: boolean
    isRegenerating?: boolean
    previewData?: { original: string; new: string } | null
    resultType?: 'edit' | 'ask' | null
    onConfirmPreview?: () => void
    onCancelPreview?: () => void
    selectedText?: string
}

export default function AIDialog({
    isOpen,
    onClose,
    onSubmit,
    onRegenerate,
    isLoading = false,
    isRegenerating = false,
    previewData,
    resultType = null,
    onConfirmPreview,
    onCancelPreview,
    selectedText = ''
}: AIDialogProps) {
    const [instruction, setInstruction] = useState('')
    const [conversation, setConversation] = useState<{ q: string; a: string }[]>([])
    const [copied, setCopied] = useState<'answer' | 'suggestion' | ''>('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const answerEndRef = useRef<HTMLDivElement>(null)

    // 每次打开时重置所有状态
    useEffect(() => {
        if (isOpen) {
            setInstruction('')
            setConversation([])
            setCopied('')
            setTimeout(() => textareaRef.current?.focus(), 100)
        }
    }, [isOpen])

    // 当 previewData 变化且是 ask 模式时，将问答加入对话历史
    useEffect(() => {
        if (previewData && resultType === 'ask' && instruction.trim()) {
            setConversation(prev => [...prev, { q: instruction.trim(), a: previewData.new }])
            setInstruction('')
            setCopied('')
        }
    }, [previewData, resultType])

    // 自动滚动到最新回答
    useEffect(() => {
        if (answerEndRef.current) {
            answerEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [conversation])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                e.preventDefault()
                onClose()
            }
            if (e.key === 'Enter' && !e.shiftKey && isOpen && !isLoading && !previewData) {
                e.preventDefault()
                handleSubmit()
            }
            // ask 模式下，有 previewData 时也可以按 Enter 提交新问题
            if (e.key === 'Enter' && !e.shiftKey && isOpen && !isLoading && previewData && resultType === 'ask') {
                e.preventDefault()
                handleSubmit()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, instruction, onClose, onSubmit, isLoading, previewData, resultType])

    const handleSubmit = async () => {
        const trimmed = instruction.trim()
        if (!trimmed || isLoading) return
        onSubmit(trimmed)
    }

    const copyToClipboard = async (text: string, type: 'answer' | 'suggestion') => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(type)
            setTimeout(() => setCopied(''), 2000)
        } catch {
            const ta = document.createElement('textarea')
            ta.value = text
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            setCopied(type)
            setTimeout(() => setCopied(''), 2000)
        }
    }

    const renderMarkdown = (text: string) => {
        try {
            const html = marked.parse(text, { async: false }) as string
            return html
        } catch {
            return text
        }
    }

    if (!isOpen) return null

    const isAskResult = resultType === 'ask'

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            pointerEvents: 'auto',
            zIndex: 99999
        }}>
            <div style={{
                width: 560,
                backgroundColor: 'white',
                borderRadius: 16,
                boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 100000,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh'
            }}>
                {/* 标题 */}
                <div style={{
                    padding: '16px 20px 12px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    fontSize: '15px', fontWeight: 600, color: '#1a1a1a',
                }}>
                    AI 编辑
                </div>

                {/* 选中内容 - 放大显示在顶部 */}
                {selectedText && (
                    <div style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                        background: 'rgba(168, 85, 247, 0.04)',
                    }}>
                        <div style={{
                            fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.35)',
                            marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>选中内容</div>
                        <div style={{
                            fontSize: '14px', lineHeight: '1.6', color: '#1a1a1a',
                            maxHeight: '120px', overflowY: 'auto',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {selectedText}
                        </div>
                    </div>
                )}

                {/* 输入区域 */}
                <div style={{ padding: '12px 20px' }}>
                    <textarea
                        ref={textareaRef}
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder={isAskResult ? "输入追问..." : "输入指令，例如：改得更简洁、翻译成英文、这段话讲了什么？"}
                        rows={2}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: 10,
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.1)',
                            resize: 'vertical',
                            fontSize: '13px',
                            lineHeight: '1.5',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            color: isLoading ? 'rgba(0,0,0,0.3)' : '#1a1a1a',
                            background: isLoading ? 'rgba(0,0,0,0.02)' : '#fff',
                            cursor: isLoading ? 'wait' : 'text',
                        }}
                    />
                </div>

                {/* 编辑模式预览（原文 | AI 建议） */}
                {previewData && !isAskResult && (
                    <div style={{ padding: '0 20px 12px', flex: 1, minHeight: 0 }}>
                        <div style={{ display: 'flex', gap: 12, minHeight: '120px' }}>
                            {/* 原文 */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.4)',
                                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                                }}>原文</div>
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(0, 0, 0, 0.03)',
                                    borderRadius: 10,
                                    fontSize: '13px', lineHeight: '1.6', color: '#1a1a1a',
                                    maxHeight: '200px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    flex: 1,
                                }}>
                                    {previewData.original}
                                </div>
                            </div>

                            {/* 箭头 */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, width: 32,
                            }}>
                                <ArrowRight size={20} color="rgba(0,0,0,0.25)" strokeWidth={1.5} />
                            </div>

                            {/* AI 建议 */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    fontSize: '11px', fontWeight: 600, color: '#a855f7',
                                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <span>AI 建议</span>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button
                                            onClick={() => copyToClipboard(previewData.new, 'suggestion')}
                                            title="复制 AI 建议"
                                            style={{
                                                border: 'none', background: 'rgba(168,85,247,0.1)',
                                                borderRadius: 6, cursor: 'pointer',
                                                padding: '3px 6px',
                                                display: 'flex', alignItems: 'center', gap: 3,
                                                fontSize: '11px', color: '#a855f7',
                                            }}
                                        >
                                            {copied === 'suggestion' ? (
                                                <><Check size={11} /> 已复制</>
                                            ) : (
                                                <Copy size={11} />
                                            )}
                                        </button>
                                        <button
                                            onClick={onRegenerate}
                                            disabled={isRegenerating}
                                            title="重新生成"
                                            style={{
                                                border: 'none', background: 'rgba(168,85,247,0.1)',
                                                borderRadius: 6, cursor: isRegenerating ? 'wait' : 'pointer',
                                                padding: '3px 6px',
                                                display: 'flex', alignItems: 'center', gap: 3,
                                                fontSize: '11px', color: '#a855f7',
                                            }}
                                        >
                                            {isRegenerating ? (
                                                <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> 生成中</>
                                            ) : (
                                                <><RefreshCw size={11} /> 重新生成</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(168, 85, 247, 0.06)',
                                    borderRadius: 10,
                                    fontSize: '13px', lineHeight: '1.6', color: '#1a1a1a',
                                    maxHeight: '200px', overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    flex: 1,
                                }}>
                                    <div
                                        className="ai-markdown-content"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(previewData.new) }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 问答模式 - 对话历史 */}
                {isAskResult && conversation.length > 0 && (
                    <div style={{
                        padding: '0 20px 12px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        borderTop: '1px solid rgba(0,0,0,0.04)',
                    }}>
                        {conversation.map((item, idx) => (
                            <div key={idx} style={{ marginTop: idx === 0 ? 12 : 16 }}>
                                <div style={{
                                    fontSize: '12px', fontWeight: 600, color: 'rgba(0,0,0,0.5)',
                                    marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <span style={{ fontSize: '11px' }}>Q:</span>
                                    <span>{item.q}</span>
                                </div>
                                <div style={{
                                    position: 'relative',
                                    padding: '10px 12px',
                                    background: 'rgba(168, 85, 247, 0.04)',
                                    borderRadius: 10,
                                    fontSize: '13px', lineHeight: '1.6', color: '#1a1a1a',
                                }}>
                                    <div
                                        className="ai-markdown-content"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(item.a) }}
                                        style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: 28 }}
                                    />
                                    <button
                                        onClick={() => copyToClipboard(item.a, 'answer')}
                                        title="复制回答"
                                        style={{
                                            position: 'absolute', top: 8, right: 8,
                                            border: 'none', background: 'rgba(0,0,0,0.04)',
                                            borderRadius: 6, cursor: 'pointer',
                                            padding: '4px 6px',
                                            display: 'flex', alignItems: 'center', gap: 3,
                                            fontSize: '11px', color: 'rgba(0,0,0,0.45)',
                                        }}
                                    >
                                        {copied === 'answer' ? (
                                            <><Check size={12} color="#30d158" /> 已复制</>
                                        ) : (
                                            <Copy size={12} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div ref={answerEndRef} />
                    </div>
                )}

                {/* 底部按钮 */}
                <div style={{
                    padding: '12px 20px 16px',
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}>
                    {previewData && !isAskResult ? (
                        // 编辑模式：显示「取消」+「确认替换」
                        <>
                            <button onClick={onCancelPreview} style={{
                                padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                                border: 'none', borderRadius: 8,
                                background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.6)',
                                cursor: 'pointer',
                            }}>取消</button>
                            <button onClick={onConfirmPreview} style={{
                                padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                                border: 'none', borderRadius: 8,
                                background: '#a855f7', color: '#fff',
                                cursor: 'pointer',
                            }}>确认替换</button>
                        </>
                    ) : isAskResult ? (
                        // 问答模式：显示「关闭」
                        <button onClick={onClose} style={{
                            padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                            border: 'none', borderRadius: 8,
                            background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.6)',
                            cursor: 'pointer',
                        }}>关闭</button>
                    ) : (
                        // 输入模式：显示「取消」+「提交」
                        <>
                            <button onClick={onClose} disabled={isLoading} style={{
                                padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                                border: 'none', borderRadius: 8,
                                background: 'rgba(0,0,0,0.06)',
                                color: isLoading ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.6)',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                            }}>取消</button>
                            <button onClick={handleSubmit} disabled={isLoading || !instruction.trim()} style={{
                                padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                                border: 'none', borderRadius: 8,
                                background: isLoading ? 'rgba(168,85,247,0.5)' : '#a855f7',
                                color: '#fff',
                                cursor: isLoading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                {isLoading ? (
                                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 处理中...</>
                                ) : (
                                    '提交'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
