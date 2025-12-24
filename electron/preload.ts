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
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32'
})

// 暴露窗口控制 API
contextBridge.exposeInMainWorld('appWindow', {
    setWidth: (width: number): Promise<boolean> =>
        ipcRenderer.invoke('window:setWidth', width)
})

// 暴露应用信息 API
contextBridge.exposeInMainWorld('app', {
    getVersion: (): Promise<string> =>
        ipcRenderer.invoke('app:getVersion')
})

// 暴露设置 API
contextBridge.exposeInMainWorld('settings', {
    get: (): Promise<Record<string, unknown>> =>
        ipcRenderer.invoke('settings:get'),

    set: (key: string, value: unknown): Promise<boolean> =>
        ipcRenderer.invoke('settings:set', key, value),

    reset: (): Promise<boolean> =>
        ipcRenderer.invoke('settings:reset')
})

// 暴露 Ollama API
contextBridge.exposeInMainWorld('ollama', {
    openModelsFolder: (): Promise<string> =>
        ipcRenderer.invoke('ollama:openModelsFolder'),

    listModels: (): Promise<{ success: boolean; models: Array<{ name: string; id: string; size: string; modified: string }> }> =>
        ipcRenderer.invoke('ollama:listModels'),

    pullModel: (modelName: string): Promise<{ success: boolean; output: string }> =>
        ipcRenderer.invoke('ollama:pullModel', modelName),

    deleteModel: (modelName: string): Promise<{ success: boolean }> =>
        ipcRenderer.invoke('ollama:deleteModel', modelName),

    cancelPull: (modelName?: string): Promise<{ success: boolean; cancelled?: string }> =>
        ipcRenderer.invoke('ollama:cancelPull', modelName),

    onPullProgress: (callback: (data: { model: string; output: string }) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: { model: string; output: string }) => callback(data)
        ipcRenderer.on('ollama:pullProgress', handler)
        return () => ipcRenderer.removeListener('ollama:pullProgress', handler)
    }
})

// 暴露快捷方式 API
contextBridge.exposeInMainWorld('shortcuts', {
    onCreateArticle: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:createArticle', handler)
        return () => ipcRenderer.removeListener('shortcuts:createArticle', handler)
    },

    onCreateFolder: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:createFolder', handler)
        return () => ipcRenderer.removeListener('shortcuts:createFolder', handler)
    },

    onOpenSettings: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:openSettings', handler)
        return () => ipcRenderer.removeListener('shortcuts:openSettings', handler)
    },

    onToggleFocusMode: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:toggleFocusMode', handler)
        return () => ipcRenderer.removeListener('shortcuts:toggleFocusMode', handler)
    }
})

console.log('🔗 Preload 脚本已加载')

