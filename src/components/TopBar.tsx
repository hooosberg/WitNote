import React, { useState, useEffect } from 'react'
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
    hasSiblingMd?: boolean  // PDF是否有同名MD文件
    hasSiblingPdf?: boolean // TXT是否有同名PDF文件
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
    hasSiblingMd?: boolean  // PDF是否有同名MD
    hasSiblingPdf?: boolean // TXT是否有同名PDF
    onFormatToggle: (format: 'md' | 'txt' | 'pdf') => void
}> = ({ currentExt, isReadOnly: _isReadOnly, hasSiblingMd, hasSiblingPdf: _hasSiblingPdf, onFormatToggle }) => {
    const [expanded, setExpanded] = useState(false)
    const [enableTransition, setEnableTransition] = useState(false)

    // Helper to get display format
    const getDisplayFormat = (ext: string) => {
        if (ext === 'pdf') return 'PDF'
        if (ext === 'txt') return 'TXT'
        if (ext === 'md' || ext === 'markdown') return 'MD'
        if (ext === 'docx') return 'DOCX'
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return ext.toUpperCase()
        }
        return ext.toUpperCase() || 'TXT'
    }

    const isTxt = currentExt === 'txt'
    const isMd = currentExt === 'md' || currentExt === 'markdown'
    const isPdf = currentExt === 'pdf'

    // Determine active index for slider positioning (PDF=0, TXT=1, MD=2)
    const activeIndex = isMd ? 2 : isTxt ? 1 : 0

    // Effect to enable transition after a short delay when expanded
    useEffect(() => {
        if (expanded) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setEnableTransition(true)
                })
            })
        } else {
            setEnableTransition(false)
        }
    }, [expanded])

    // 只读格式：图片、DOCX、无同名MD的PDF
    // MD和TXT始终可以切换（不是只读）
    const isReadOnlyFormat = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'docx'].includes(currentExt) ||
        (currentExt === 'pdf' && !hasSiblingMd)

    // Unified container for all file types to prevent layout shifts
    return (
        <div
            className="format-toggle-container"
            style={{
                position: 'relative',
                width: '44px',
                height: '30px',
                zIndex: expanded ? 100 : 1
            }}
            onMouseEnter={() => !isReadOnlyFormat && setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Collapsed state: Single button */}
            <div
                className={`segmented-control-single ${isReadOnlyFormat ? 'readonly' : ''}`}
                style={{
                    width: '100%',
                    opacity: expanded ? 0 : 1,
                    pointerEvents: expanded ? 'none' : 'auto'
                }}
            >
                <div className={`segmented-control-btn ${isReadOnlyFormat ? 'active disabled' : ''}`} style={isReadOnlyFormat ? { width: '100%', fontWeight: 600, cursor: 'default' } : undefined}>
                    {getDisplayFormat(currentExt)}
                </div>
            </div>

            {/* Expanded state: Overlay (Only for convertible types) */}
            {expanded && !isReadOnlyFormat && (
                <div className="segmented-control"
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0, // Anchor to right to expand left
                        minWidth: '140px',
                        fontSize: '11px' // Ensure text size matches collapsed state
                    }}
                >
                    {/* Background Slider */}
                    <div
                        className="segmented-control-slider"
                        style={{
                            transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 2}px))`,
                            transition: enableTransition ? undefined : 'none'
                        }}
                    />

                    {/* PDF Button */}
                    <button
                        className={`segmented-control-btn ${isPdf ? 'active' : ''}`}
                        onClick={() => {
                            if (!isPdf) {
                                // MD 模式下点击 PDF 执行导出
                                onFormatToggle('pdf')
                            }
                        }}
                        title={isPdf ? '当前格式' : (isMd ? '导出为 PDF' : '切换到 PDF')}
                        style={{ fontSize: '11px', cursor: isPdf ? 'default' : 'pointer' }}
                    >
                        PDF
                    </button>

                    {/* TXT Button */}
                    <button
                        className={`segmented-control-btn ${isTxt ? 'active' : ''}`}
                        onClick={() => {
                            if (!isTxt) {
                                onFormatToggle('txt')
                            }
                        }}
                        title="转换为 TXT"
                        style={{ fontSize: '11px' }}
                    >
                        TXT
                    </button>

                    {/* MD Button */}
                    <button
                        className={`segmented-control-btn ${isMd ? 'active' : ''}`}
                        onClick={() => !isMd && onFormatToggle('md')}
                        title="转换为 Markdown"
                        style={{ fontSize: '11px' }}
                    >
                        MD
                    </button>
                </div>
            )}
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

    const isReadOnlyType = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)

    return (
        <div
            className={`segmented-control-single ${isReadOnlyType ? 'readonly' : ''}`}
            style={{
                width: '44px',
                height: '30px'
            }}
        >
            <div
                className="segmented-control-btn active disabled"
                style={{
                    width: '100%',
                    fontWeight: 600,
                    cursor: 'default',
                    opacity: 1 // Ensure visibility matches active state
                }}
            >
                {getDisplayFormat()}
            </div>
        </div>
    )
}

// 编辑模式切换按钮 - 悬停展开风格
// 编辑模式切换按钮 - 分段控制器风格 (Segmented Control)
const EditModeToggle: React.FC<{
    previewMode: 'edit' | 'preview' | 'split'
    onPreviewModeChange: (mode?: 'edit' | 'preview' | 'split') => void
    currentExt: string  // 当前文件扩展名，用于判断模式可用性
}> = ({ previewMode, onPreviewModeChange, currentExt }) => {
    const [hoveredDisabled, setHoveredDisabled] = useState<'edit' | 'preview' | 'split' | null>(null)

    // 检查各模式是否可用
    // 注意：DOCX 文件虽然是只读，但应该允许 Preview 和 Split 模式（Split 时右侧显示）
    // 当前 isModeAvailable 对 DOCX 的 edit 返回 false, preview 返回 true, split 返回 true (如果未特别限制)
    const editAvailable = isModeAvailable('edit', currentExt)
    const previewAvailable = isModeAvailable('preview', currentExt)
    const splitAvailable = isModeAvailable('split', currentExt)

    // 获取禁用提示
    const getTooltip = (mode: 'edit' | 'preview' | 'split', isDisabled: boolean) => {
        if (isDisabled) {
            return getDisabledModeTooltip(mode, currentExt) || '此模式不可用'
        }
        switch (mode) {
            case 'edit': return '编辑'
            case 'preview': return '预览'
            case 'split': return '分屏'
        }
    }

    // Determine active index for slider positioning
    const activeIndex = previewMode === 'edit' ? 0 : previewMode === 'preview' ? 1 : 2;

    // Icon helper
    const renderIcon = (mode: 'edit' | 'preview' | 'split', available: boolean) => {
        if (!available && hoveredDisabled === mode) {
            return <X size={14} strokeWidth={2.5} style={{ opacity: 0.7 }} />
        }

        const strokeWidth = previewMode === mode ? 2 : 1.5;

        switch (mode) {
            case 'edit': return <Pencil size={15} strokeWidth={strokeWidth} />
            case 'preview': return <Eye size={15} strokeWidth={strokeWidth} />
            case 'split': return <Columns2 size={15} strokeWidth={strokeWidth} />
        }
    }

    return (
        <div className="segmented-control">
            {/* Background Slider */}
            <div
                className="segmented-control-slider"
                style={{
                    transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 2}px))`
                }}
            />

            {/* Edit Button */}
            <button
                className={`segmented-control-btn ${previewMode === 'edit' ? 'active' : ''} ${!editAvailable ? 'disabled' : ''}`}
                onClick={() => editAvailable && onPreviewModeChange('edit')}
                title={getTooltip('edit', !editAvailable)}
                disabled={!editAvailable}
                onMouseEnter={() => !editAvailable && setHoveredDisabled('edit')}
                onMouseLeave={() => setHoveredDisabled(null)}
            >
                {renderIcon('edit', editAvailable)}
            </button>

            {/* Preview Button */}
            <button
                className={`segmented-control-btn ${previewMode === 'preview' ? 'active' : ''} ${!previewAvailable ? 'disabled' : ''}`}
                onClick={() => previewAvailable && onPreviewModeChange('preview')}
                title={getTooltip('preview', !previewAvailable)}
                disabled={!previewAvailable}
                onMouseEnter={() => !previewAvailable && setHoveredDisabled('preview')}
                onMouseLeave={() => setHoveredDisabled(null)}
            >
                {renderIcon('preview', previewAvailable)}
            </button>

            {/* Split Button */}
            <button
                className={`segmented-control-btn ${previewMode === 'split' ? 'active' : ''} ${!splitAvailable ? 'disabled' : ''}`}
                onClick={() => splitAvailable && onPreviewModeChange('split')}
                title={getTooltip('split', !splitAvailable)}
                disabled={!splitAvailable}
                onMouseEnter={() => !splitAvailable && setHoveredDisabled('split')}
                onMouseLeave={() => setHoveredDisabled(null)}
            >
                {renderIcon('split', splitAvailable)}
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
    rightCollapsed: _,
    previewMode = 'edit',
    onPreviewModeChange,
    focusMode = false,
    onFocusModeChange,
    activeFile,
    previewFile,
    onFormatToggle,
    hasSiblingMd,
    hasSiblingPdf,
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
                                    hasSiblingMd={hasSiblingMd}
                                    hasSiblingPdf={hasSiblingPdf}
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
