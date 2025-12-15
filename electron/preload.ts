/**
 * Electron 预加载脚本
 * 使用 contextBridge 安全暴露 API 到渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron'

// 文件变化事件类型
interface FileChangeEvent {
    type: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'
    path: string
}

// 文件节点类型
interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    extension?: string
    modifiedAt?: number  // 修改时间戳（毫秒）
}

// 暴露文件系统 API
contextBridge.exposeInMainWorld('fs', {
    // Vault 路径管理
    getVaultPath: (): Promise<string | null> =>
        ipcRenderer.invoke('fs:getVaultPath'),

    setVaultPath: (path: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:setVaultPath', path),

    selectDirectory: (): Promise<string | null> =>
        ipcRenderer.invoke('fs:selectDirectory'),

    disconnectVault: (): Promise<boolean> =>
        ipcRenderer.invoke('fs:disconnectVault'),

    // 文件操作
    readDirectory: (path?: string): Promise<FileNode[]> =>
        ipcRenderer.invoke('fs:readDirectory', path),

    readFile: (path: string): Promise<string> =>
        ipcRenderer.invoke('fs:readFile', path),

    writeFile: (path: string, content: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:writeFile', path, content),

    createFile: (path: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:createFile', path),

    createDirectory: (path: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:createDirectory', path),

    deleteFile: (path: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:deleteFile', path),

    renameFile: (oldPath: string, newPath: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:renameFile', oldPath, newPath),

    // 文件监听
    watch: (path?: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:watch', path),

    unwatch: (): Promise<boolean> =>
        ipcRenderer.invoke('fs:unwatch'),

    onFileChange: (callback: (event: FileChangeEvent) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: FileChangeEvent) => {
            callback(data)
        }
        ipcRenderer.on('fs:change', handler)

        // 返回清理函数
        return () => {
            ipcRenderer.removeListener('fs:change', handler)
        }
    }
})

// 暴露聊天存储 API
contextBridge.exposeInMainWorld('chat', {
    load: (filePath: string): Promise<unknown[]> =>
        ipcRenderer.invoke('chat:load', filePath),

    save: (filePath: string, messages: unknown[]): Promise<boolean> =>
        ipcRenderer.invoke('chat:save', filePath, messages)
})

// 暴露平台信息
contextBridge.exposeInMainWorld('platform', {
    os: process.platform,
    isMac: process.platform === 'darwin'
})

console.log('🔗 Preload 脚本已加载')
