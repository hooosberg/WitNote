/**
 * Toast 通知组件
 * 用于显示引擎切换等系统通知
 */

import React, { useState, useEffect, useCallback } from 'react'

// Toast 类型
export type ToastType = 'success' | 'warning' | 'error' | 'info'

// Toast 消息
export interface ToastMessage {
    id: string
    type: ToastType
    message: string
    duration?: number
}

// Toast 上下文
interface ToastContextValue {
    showToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = `toast-${Date.now()}`
        setToasts(prev => [...prev, { id, type, message, duration }])

        // 自动移除
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    )
}

// Hook 获取 Toast 方法
export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

// Toast 容器
interface ToastContainerProps {
    toasts: ToastMessage[]
    onRemove: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    )
}

// 单个 Toast
interface ToastProps {
    toast: ToastMessage
    onRemove: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true)
        }, (toast.duration || 3000) - 300)

        return () => clearTimeout(exitTimer)
    }, [toast.duration])

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return '✅'
            case 'warning': return '⚠️'
            case 'error': return '❌'
            case 'info': return 'ℹ️'
        }
    }

    return (
        <div
            className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
            onClick={() => onRemove(toast.id)}
        >
            <span className="toast-icon">{getIcon()}</span>
            <span className="toast-message">{toast.message}</span>
        </div>
    )
}

export default Toast
