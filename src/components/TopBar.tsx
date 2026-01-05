import React, { useState } from 'react'
import { Pencil, Eye, Columns2, Glasses, Coffee, Search, X } from 'lucide-react'
import { FileNode } from '../hooks/useFileSystem'
import { useTranslation } from 'react-i18next'
import { isModeAvailable, getDisabledModeTooltip } from '../utils/fileCapabilities'

interface TopBarProps {
    // Layout state
    leftCollapsed: boolean
    rightCollapsed: boolean

    // Preview/Focus Mode state
    previewMode?: 'edit' | 'preview' | 'split'
    onPreviewModeChange?: (mode?: 'edit' | 'preview' | 'split') => void
    focusMode?: boolean
    onFocusModeChange?: () => void

    // File state
    activeFile: FileNode | null
    previewFile?: FileNode | null  // 双栏模式下右侧预览的文件
    fileContent: string | null

    // Editor actions
    onFormatToggle: (format: 'md' | 'txt' | 'pdf') => void
    isMarkdown: boolean

    // Chat state
    currentEngine: string
    onEngineChange?: () => void

    // Search state (for Gallery)
    searchQuery?: string
    onSearchChange?: (query: string) => void

    // General
    className?: string
}

const FormatToggle: React.FC<{
    currentExt: string
    isReadOnly: boolean
    onFormatToggle: (format: 'md' | 'txt' | 'pdf') => void
}> = ({ currentExt, isReadOnly, onFormatToggle }) => {
    const [expanded, setExpanded] = useState(false)

    // 获取显示的格式文字
    const getDisplayFormat = () => {
        if (currentExt === 'pdf') return 'PDF'
        if (currentExt === 'txt') return 'TXT'
        if (currentExt === 'md' || currentExt === 'markdown') return 'MD'
        if (currentExt === 'docx') return 'DOCX'
        // 图片格式
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(currentExt)) {
            return currentExt.toUpperCase()
        }
        return currentExt.toUpperCase() || 'TXT'
    }

    const isTxt = currentExt === 'txt'
    const isMd = currentExt === 'md' || currentExt === 'markdown'

    // 只读格式（PDF、DOCX、图片）不可点击展开
    if (isReadOnly) {
        return (
            <div className="format-toggle-single">
                <button
                    className="format-btn active disabled"
                    disabled
                    title="只读格式，无法转换"
                >
                    {getDisplayFormat()}
                </button>
            </div>
        )
    }

    // MD 或 TXT - 悬停展开
    if (!expanded) {
        return (
            <div
                className="format-toggle-single"
                onMouseEnter={() => setExpanded(true)}
            >
                <button className="format-btn active">
                    {getDisplayFormat()}
                </button>
            </div>
        )
    }

    // 展开状态 - 显示三个选项
    return (
        <div
            className="format-toggles"
            onMouseLeave={() => setExpanded(false)}
        >
            <button
                className="format-btn disabled"
                disabled
                title="PDF 导出暂不支持"
            >
                PDF
            </button>
            <button
                className={`format-btn ${isTxt ? 'active' : ''}`}
                onClick={() => {
                    if (!isTxt) {
                        onFormatToggle('txt')
                    }
                    setExpanded(false)
                }}
                title="TXT"
            >
                TXT
            </button>
            <button
                className={`format-btn ${isMd ? 'active' : ''}`}
                onClick={() => {
                    if (!isMd) {
                        onFormatToggle('md')
                    }
                    setExpanded(false)
                }}
                title="MD"
            >
                MD
            </button>
        </div>
    )
}

// 只读格式指示器（用于双栏模式右侧预览）
const FormatIndicator: React.FC<{ ext: string }> = ({ ext }) => {
    const getDisplayFormat = () => {
        if (ext === 'pdf') return 'PDF'
        if (ext === 'txt') return 'TXT'
        if (ext === 'md' || ext === 'markdown') return 'MD'
        if (ext === 'docx') return 'DOCX'
        return ext.toUpperCase() || 'TXT'
    }

    return (
        <div className="format-toggle-single">
            <button className="format-btn active disabled" disabled>
                {getDisplayFormat()}
            </button>
        </div>
    )
}

// 编辑模式切换按钮 - 悬停展开风格
const EditModeToggle: React.FC<{
    previewMode: 'edit' | 'preview' | 'split'
    onPreviewModeChange: (mode?: 'edit' | 'preview' | 'split') => void
    currentExt: string  // 当前文件扩展名，用于判断模式可用性
}> = ({ previewMode, onPreviewModeChange, currentExt }) => {
    const [expanded, setExpanded] = useState(false)
    const [hoveredDisabled, setHoveredDisabled] = useState<'edit' | 'preview' | 'split' | null>(null)

    // 检查各模式是否可用
    const editAvailable = isModeAvailable('edit', currentExt)
    const previewAvailable = isModeAvailable('preview', currentExt)
    const splitAvailable = isModeAvailable('split', currentExt)

    // 获取当前模式的图标（禁用悬停时显示叉号）
    const getModeIcon = (mode: 'edit' | 'preview' | 'split', isDisabled: boolean, isHovered: boolean) => {
        // 如果是禁用模式且正在悬停，显示叉号
        if (isDisabled && isHovered) {
            return <X size={14} strokeWidth={1.5} />
        }
        switch (mode) {
            case 'edit': return <Pencil size={14} strokeWidth={1.5} />
            case 'preview': return <Eye size={14} strokeWidth={1.5} />
            case 'split': return <Columns2 size={14} strokeWidth={1.5} />
        }
    }

    // 获取禁用提示
    const getTooltip = (mode: 'edit' | 'preview' | 'split', isDisabled: boolean) => {
        if (isDisabled) {
            return getDisabledModeTooltip(mode, currentExt) || '此模式不可用'
        }
        switch (mode) {
            case 'edit': return '编辑模式'
            case 'preview': return '预览模式'
            case 'split': return '分屏模式'
        }
    }

    if (!expanded) {
        return (
            <div
                className="format-toggle-single"
                onMouseEnter={() => setExpanded(true)}
            >
                <button
                    className="topbar-icon-btn active"
                    onClick={() => onPreviewModeChange()} // 默认行为：循环切换
                    title={previewMode === 'edit' ? '编辑模式' : previewMode === 'preview' ? '预览模式' : '分屏模式'}
                >
                    {getModeIcon(previewMode, false, false)}
                </button>
            </div>
        )
    }

    // 展开状态 - 显示三个模式选项
    return (
        <div
            className="format-toggles icon-toggles"
            onMouseLeave={() => {
                setExpanded(false)
                setHoveredDisabled(null)
            }}
        >
            <button
                className={`topbar-icon-btn ${previewMode === 'edit' ? 'active' : ''} ${!editAvailable ? 'disabled' : ''}`}
                onClick={() => {
                    if (editAvailable) {
                        onPreviewModeChange('edit')
                        setExpanded(false)
                    }
                }}
                onMouseEnter={() => !editAvailable && setHoveredDisabled('edit')}
                onMouseLeave={() => setHoveredDisabled(null)}
                title={getTooltip('edit', !editAvailable)}
                disabled={!editAvailable}
            >
                {getModeIcon('edit', !editAvailable, hoveredDisabled === 'edit')}
            </button>
            <button
                className={`topbar-icon-btn ${previewMode === 'preview' ? 'active' : ''} ${!previewAvailable ? 'disabled' : ''}`}
                onClick={() => {
                    if (previewAvailable) {
                        onPreviewModeChange('preview')
                        setExpanded(false)
                    }
                }}
                onMouseEnter={() => !previewAvailable && setHoveredDisabled('preview')}
                onMouseLeave={() => setHoveredDisabled(null)}
                title={getTooltip('preview', !previewAvailable)}
                disabled={!previewAvailable}
            >
                {getModeIcon('preview', !previewAvailable, hoveredDisabled === 'preview')}
            </button>
            <button
                className={`topbar-icon-btn ${previewMode === 'split' ? 'active' : ''} ${!splitAvailable ? 'disabled' : ''}`}
                onClick={() => {
                    if (splitAvailable) {
                        onPreviewModeChange('split')
                        setExpanded(false)
                    }
                }}
                onMouseEnter={() => !splitAvailable && setHoveredDisabled('split')}
                onMouseLeave={() => setHoveredDisabled(null)}
                title={getTooltip('split', !splitAvailable)}
                disabled={!splitAvailable}
            >
                {getModeIcon('split', !splitAvailable, hoveredDisabled === 'split')}
            </button>
        </div>
    )
}

// 专注模式按钮 - 直接点击切换
const FocusModeToggle: React.FC<{
    focusMode: boolean
    onFocusModeChange: () => void
}> = ({ focusMode, onFocusModeChange }) => {
    return (
        <div className="format-toggle-single">
            <button
                className={`topbar-btn ${focusMode ? 'active' : ''}`}
                onClick={onFocusModeChange}
                title={focusMode ? '退出专注' : '专注模式'}
            >
                {focusMode ? <Coffee size={15} strokeWidth={1.5} /> : <Glasses size={15} strokeWidth={1.5} />}
            </button>
        </div>
    )
}

export const TopBar: React.FC<TopBarProps> = ({
    leftCollapsed,
    rightCollapsed,
    previewMode = 'edit',
    onPreviewModeChange,
    focusMode = false,
    onFocusModeChange,
    activeFile,
    previewFile,
    onFormatToggle,
    searchQuery = '',
    onSearchChange,
    className = ''
}) => {
    const { t } = useTranslation()

    // 获取当前文件扩展名
    const currentExt = activeFile?.extension?.toLowerCase()?.replace('.', '') || ''
    // 判断是否为只读格式（PDF、DOCX、图片）
    const isReadOnly = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(currentExt)

    // 获取预览文件扩展名（双栏模式）
    const previewExt = previewFile?.extension?.toLowerCase()?.replace('.', '') || ''

    // 是否处于双栏模式
    const isDualPane = activeFile && previewFile

    return (
        <div className={`app-topbar ${className}`}>
            {/* Left Section - 仅保留 Mac 红绿灯空间 */}
            {!leftCollapsed && (
                <div className="topbar-section left">
                    <div className="window-controls-spacer" />
                </div>
            )}

            {/* Center Section - 编辑区顶部控制 OR 画廊搜索框 */}
            <div className="topbar-section center">
                {/* 如果没有打开文件，显示画廊搜索框 */}
                {!activeFile ? (
                    <div className="topbar-search-container">
                        <div className="gallery-search-box">
                            <Search size={14} className="search-icon" />
                            <input
                                type="text"
                                className="gallery-search-input"
                                placeholder={t('gallery.searchPlaceholder') || '搜索...'}
                                value={searchQuery}
                                onChange={(e) => onSearchChange?.(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className="search-clear-btn"
                                    onClick={() => onSearchChange?.('')}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 左侧留空用于拖拽 */}
                        <div className="topbar-drag-area" />

                        {/* 右侧：格式切换按钮 (非专注模式下显示在中间) */}
                        {!focusMode && (
                            <div className="topbar-controls">
                                {/* 左栏格式 */}
                                <FormatToggle
                                    currentExt={currentExt}
                                    isReadOnly={isReadOnly}
                                    onFormatToggle={onFormatToggle}
                                />

                                {/* 双栏模式：右栏格式（只读指示器） */}
                                {isDualPane && (
                                    <>
                                        <div className="topbar-divider" />
                                        <FormatIndicator ext={previewExt} />
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Right Section - 控制按钮 (靠右对齐) */}
            <div className="topbar-section right" style={{ justifyContent: 'flex-end', paddingRight: '12px' }}>
                <div className="topbar-controls">
                    {/* 专注模式下：格式切换按钮移到这里 */}
                    {activeFile && focusMode && (
                        <>
                            <FormatToggle
                                currentExt={currentExt}
                                isReadOnly={isReadOnly}
                                onFormatToggle={onFormatToggle}
                            />
                            {/* 专注模式下通常没有双栏，如果有也显示指示器 */}
                            {isDualPane && (
                                <>
                                    <div className="topbar-divider" />
                                    <FormatIndicator ext={previewExt} />
                                </>
                            )}
                        </>
                    )}

                    {/* Preview/Edit/Split Toggle - 始终显示，保持 UI 稳定性 */}
                    {onPreviewModeChange && (
                        <EditModeToggle
                            previewMode={previewMode}
                            onPreviewModeChange={onPreviewModeChange}
                            currentExt={currentExt}
                        />
                    )}

                    {/* Focus Mode Toggle - 始终显示 */}
                    {onFocusModeChange && (
                        <FocusModeToggle
                            focusMode={focusMode}
                            onFocusModeChange={onFocusModeChange}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
