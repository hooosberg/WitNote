import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 平台信息
    platform: process.platform,

    // IPC 通信（预留）
    send: (channel: string, data: unknown) => {
        const validChannels = ['note:save', 'note:load']
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data)
        }
    },

    receive: (channel: string, callback: (...args: unknown[]) => void) => {
        const validChannels = ['note:loaded', 'note:saved']
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => callback(...args))
        }
    }
})

console.log('🔗 Preload 脚本已加载')
