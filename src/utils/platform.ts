/**
 * 平台检测工具
 * 用于区分不同操作系统平台的功能支持
 */

/**
 * 检测是否为 Windows 平台
 */
export const isWindows = (): boolean => {
    // 优先使用 Electron 的 process.platform
    if (typeof process !== 'undefined' && process.platform) {
        return process.platform === 'win32'
    }
    // 回退到 navigator.platform
    if (typeof navigator !== 'undefined' && navigator.platform) {
        return navigator.platform.toLowerCase().includes('win')
    }
    return false
}

/**
 * 检测是否启用 WebLLM
 * macOS 和 Linux 启用，Windows 禁用
 * 
 * 注意：Windows 版本因 WebGPU 兼容性问题无法正常运行 WebLLM
 */
export const isWebLLMEnabled = (): boolean => {
    // 构建时禁用标志（Windows 构建会设置此值）
    if (import.meta.env.DISABLE_WEBLLM === 'true' || import.meta.env.DISABLE_WEBLLM === true) {
        return false
    }
    // 运行时平台检测
    return !isWindows()
}
