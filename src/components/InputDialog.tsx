/**
 * 输入对话框组件
 * 替代浏览器原生 prompt()
 */

import React, { useState, useRef, useEffect } from 'react'

interface InputDialogProps {
    isOpen: boolean
    title: string
    placeholder?: string
    defaultValue?: string
    onConfirm: (value: string) => void
    onCancel: () => void
}

export const InputDialog: React.FC<InputDialogProps> = ({
    isOpen,
    title,
    placeholder = '',
    defaultValue = '',
    onConfirm,
    onCancel
}) => {
    const [value, setValue] = useState(defaultValue)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen, defaultValue])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (value.trim()) {
            onConfirm(value.trim())
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel()
        }
    }

    if (!isOpen) return null

    return (
        <div className="dialog-overlay" onClick={onCancel}>
            <div className="dialog-content" onClick={e => e.stopPropagation()}>
                <h3 className="dialog-title">{title}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="text"
                        className="dialog-input"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        autoFocus
                    />
                    <div className="dialog-buttons">
                        <button type="button" className="dialog-btn cancel" onClick={onCancel}>
                            取消
                        </button>
                        <button type="submit" className="dialog-btn confirm" disabled={!value.trim()}>
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default InputDialog
