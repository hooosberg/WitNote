/**
 * 文件能力判断工具
 * 根据文件扩展名判断文件的编辑、转换、预览等能力
 */

import { EDITABLE_EXTENSIONS, VIEWABLE_EXTENSIONS, IMAGE_EXTENSIONS } from '../hooks/useFileSystem'

export interface FileCapabilities {
    canEdit: boolean       // 是否可编辑内容
    canConvert: boolean    // 是否可格式转换
    canPreview: boolean    // 是否可渲染预览（MD 预览）
    isReadOnly: boolean    // 是否只读
}

/**
 * 根据文件扩展名获取文件能力
 * @param extension 文件扩展名 (可带 . 或不带)
 */
export function getFileCapabilities(extension: string): FileCapabilities {
    // 标准化扩展名
    const ext = extension?.toLowerCase()?.replace('.', '') || ''
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`

    // 可编辑格式: .md, .txt
    const isEditable = EDITABLE_EXTENSIONS.includes(normalizedExt)

    // 只读预览格式: .pdf, .docx
    const isViewable = VIEWABLE_EXTENSIONS.includes(normalizedExt)

    // 图片格式
    const isImage = IMAGE_EXTENSIONS.includes(normalizedExt)

    // MD 格式可以渲染预览
    const isMd = ext === 'md' || ext === 'markdown'

    return {
        canEdit: isEditable,
        canConvert: isEditable, // 只有 md/txt 可以互相转换
        canPreview: isMd || isViewable || isImage, // MD 可预览，PDF/DOCX/图片也是预览模式
        isReadOnly: !isEditable
    }
}

/**
 * 获取禁用模式的提示文本
 */
export function getDisabledModeTooltip(mode: 'edit' | 'preview' | 'split', extension: string): string | null {
    const ext = extension?.toLowerCase()?.replace('.', '') || ''

    if (mode === 'edit') {
        // 只读格式不可编辑
        if (['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            return '此格式不可编辑'
        }
    }

    if (mode === 'preview') {
        // TXT 不支持预览
        if (ext === 'txt') {
            return 'TXT 格式无预览'
        }
    }

    return null
}

/**
 * 判断某个编辑模式是否可用
 */
export function isModeAvailable(mode: 'edit' | 'preview' | 'split', extension: string): boolean {
    const ext = extension?.toLowerCase()?.replace('.', '') || ''

    if (mode === 'edit') {
        // 只读格式不可编辑
        return !['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
    }

    if (mode === 'preview') {
        // TXT 不支持预览
        return ext !== 'txt'
    }

    // split 模式始终可用
    return true
}
