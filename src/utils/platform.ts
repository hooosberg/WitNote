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
 * 开源版本全面聚焦 Ollama (本地引擎) 与 Cloud API (云端接口)，精简实验性内置模型
 */
export const isWebLLMEnabled = (): boolean => {
    return false
}
