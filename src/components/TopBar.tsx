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
    const [hoveredDisabled, setHoveredDisabled] = useState<'md' | 'txt' | 'pdf' | null>(null)
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
    // If not one of these, default to 0 (PDF) or hide effect? 
    // We'll stick to 0 for PDF/Other, 1 for TXT, 2 for MD.
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

    // For read-only non-PDF files (images/docx), we might want to disable interaction 
    // but keep the visual consistency of the 3-segment control, 
    // OR just show a single disabled state if it significantly differs?
    // User requested "size specification should be exactly the same".
    // So even for readonly, we should probably keep the 3-segment look but maybe lock it?
    // However, for images/docx, "PDF/TXT/MD" options don't make sense.
    // Let's keep the special single-read-only state for exotic files, 
    // BUT for PDF (which is one of the toggles), we might want it in the toggle group?
    // Actually, PDF is usually just a target format. The current file IS PDF.
    // So if file is PDF, Pdf button is active.

    // If the file is strictly read-only (like an image), showing PDF/TXT/MD toggles is confusing.
    // We will keep the generic read-only single state for purely non-convertible things (images),
    // but for text-based things (even if currently read-only like PDF in some contexts), 
    // we might want the toggle if it's about *converting*?
    // The previous logic had `if (isReadOnly) return ...`.
    // Let's stick to that for Images/DOCX to avoid confusion.
    // PDF is technically "read only" in this app's context (can't edit text), but it IS one of the formats in the toggle.
    // So if current is PDF, we should show the toggle with PDF selected?
    // Re-reading logic: `isReadOnly` is passed in.
    // If `isReadOnly` is true, simple view. 
    // But wait, the user wants "size specification exactly the same".
    // If I show a single button for PDF, it won't match the 3-button size.
    // The user's screenshot showed "PDF TXT MD" with MD selected.
    // So likely they want the full control even if it's just indicating state.

    // Let's try to render the full control even for `isReadOnly`, but disable buttons?
    // If it is an image, "PDF TXT MD" makes no sense.
    // I will assume for "PDF", "TXT", "MD" files, we show the full control.
    // For Image/DOCX, we might still have to use the single tag, or maybe a full width tag?
    // Let's optimize for the common case (MD/TXT/PDF) to match the requested look.

    const isIMAGEorDOCX = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'docx'].includes(currentExt)

    // For non-convertible files, always use simple display
    if (isIMAGEorDOCX) {
        return (
            <div className="segmented-control simple-display">
                <div className="segmented-control-btn active disabled" style={{ width: '100%', fontWeight: 600 }}>
                    {getDisplayFormat(currentExt)}
                </div>
            </div>
        )
    }

    // Collapsed state: Single button that looks EXACTLY like the active segment
    // We use .segmented-control-single which we styled to match the slider thumb
    if (!expanded) {
        return (
            <div
                className="segmented-control-single"
                onMouseEnter={() => setExpanded(true)}
                style={{ width: '44px' }} // Approximate width of one segment
            >
                <div className="segmented-control-btn">
                    {getDisplayFormat(currentExt)}
                </div>
            </div>
        )
    }

    // Expanded state
    return (
        <div className="segmented-control"
            onMouseLeave={() => {
                setExpanded(false)
                setHoveredDisabled(null)
            }}
            style={{
                minWidth: '140px',
                // Animation origin could be set in CSS or here
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
                className={`segmented-control-btn ${isPdf ? 'active' : ''} disabled`}
                disabled
                title={isPdf ? '当前格式' : 'PDF 导出暂不支持'}
                onMouseEnter={() => setHoveredDisabled('pdf')}
                onMouseLeave={() => setHoveredDisabled(null)}
                style={{ cursor: 'not-allowed', opacity: isPdf ? 1 : 0.5 }}
            >
                PDF
            </button>

            {/* TXT Button */}
            <button
                className={`segmented-control-btn ${isTxt ? 'active' : ''}`}
                onClick={() => {
                    if (!isTxt) {
                        onFormatToggle('txt')
                        // Keep expanded on click to allow rapid changes or see feedback?
                        // User said "Mouse not up -> not expanded" which implies "mouse up -> expanded"
                        // If I click, I am still hovering.
                    }
                }}
                title="转换为 TXT"
            >
                TXT
            </button>

            {/* MD Button */}
            <button
                className={`segmented-control-btn ${isMd ? 'active' : ''}`}
                onClick={() => !isMd && onFormatToggle('md')}
                title="转换为 Markdown"
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
