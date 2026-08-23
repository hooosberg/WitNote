/**
 * AI 编辑结果预览组件
 * 左右两栏对比原文和 AI 修改后的文字
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight } from 'lucide-react'

interface DiffPreviewProps {
    originalText: string
    newText: string
    onConfirm: () => void
    onCancel: () => void
}

const DiffPreview: React.FC<DiffPreviewProps> = ({ originalText, newText, onConfirm, onCancel }) => {
    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 20000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)',
        }}>
            <div style={{
                width: '700px', maxWidth: 'calc(100vw - 48px)',
                background: '#fff', borderRadius: '16px',
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
            }}>
                {/* 标题 */}
                <div style={{
                    padding: '16px 20px 12px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    fontSize: '15px', fontWeight: 600, color: '#1a1a1a',
                }}>
                    AI 修改预览
                </div>

                {/* 对比区域 */}
                <div style={{ display: 'flex', padding: '16px 20px', gap: '12px', minHeight: '120px' }}>
                    {/* 原文 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.4)',
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                        }}>原文</div>
                        <div style={{
                            padding: '10px 12px',
                            background: 'rgba(0, 0, 0, 0.03)',
                            borderRadius: '10px',
                            fontSize: '13px', lineHeight: '1.6', color: '#1a1a1a',
                            maxHeight: '300px', overflowY: 'auto',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {originalText}
                        </div>
                    </div>

                    {/* 箭头 */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, width: '32px',
                    }}>
                        <ArrowRight size={20} color="rgba(0,0,0,0.25)" strokeWidth={1.5} />
                    </div>

                    {/* AI 建议 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '11px', fontWeight: 600, color: '#a855f7',
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
                        }}>AI 建议</div>
                        <div style={{
                            padding: '10px 12px',
                            background: 'rgba(168, 85, 247, 0.06)',
                            borderRadius: '10px',
                            fontSize: '13px', lineHeight: '1.6', color: '#1a1a1a',
                            maxHeight: '300px', overflowY: 'auto',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                            {newText}
                        </div>
                    </div>
                </div>

                {/* 底部按钮 */}
                <div style={{
                    padding: '12px 20px 16px',
                    display: 'flex', justifyContent: 'flex-end', gap: '8px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                }}>
                    <button onClick={onCancel} style={{
                        padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                        border: 'none', borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.06)', color: 'rgba(0,0,0,0.6)',
                        cursor: 'pointer',
                    }}>取消</button>
                    <button onClick={onConfirm} style={{
                        padding: '7px 18px', fontSize: '13px', fontWeight: 500,
                        border: 'none', borderRadius: '8px',
                        background: '#a855f7', color: '#fff',
                        cursor: 'pointer',
                    }}>确认替换</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default DiffPreview
