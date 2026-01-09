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

    readFileBuffer: (path: string): Promise<ArrayBuffer> =>
        ipcRenderer.invoke('fs:readFileBuffer', path),

    // 外部文件导入
    copyExternalFile: (externalPath: string, targetDir: string): Promise<string | null> =>
        ipcRenderer.invoke('fs:copyExternalFile', externalPath, targetDir),

    // 图片操作
    saveImage: (relativeDirPath: string, base64Data: string, fileName?: string): Promise<string> =>
        ipcRenderer.invoke('fs:saveImage', relativeDirPath, base64Data, fileName),

    selectAndCopyImage: (relativeDirPath: string): Promise<string | null> =>
        ipcRenderer.invoke('fs:selectAndCopyImage', relativeDirPath),

    // 下载网络图片并保存到本地
    downloadAndSaveImage: (imageUrl: string, relativeDirPath: string): Promise<string | null> =>
        ipcRenderer.invoke('fs:downloadAndSaveImage', imageUrl, relativeDirPath),

    // 图片引用检查与清理
    isImageReferenced: (imageRelativePath: string, excludeFilePath?: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:isImageReferenced', imageRelativePath, excludeFilePath),

    deleteUnreferencedImage: (imageRelativePath: string): Promise<boolean> =>
        ipcRenderer.invoke('fs:deleteUnreferencedImage', imageRelativePath),

    // PDF 导出
    exportMarkdownToPdf: (
        htmlContent: string,
        outputPath: string,
        title: string
    ): Promise<{ success: boolean, error?: string }> =>
        ipcRenderer.invoke('export-markdown-to-pdf', {
            htmlContent,
            outputPath,
            title
        }),

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
        ipcRenderer.invoke('chat:save', filePath, messages),

    deleteAll: (): Promise<boolean> =>
        ipcRenderer.invoke('chat:deleteAll')
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

// 暴露 Vault 设置同步 API
contextBridge.exposeInMainWorld('vault', {
    // 同步设置到 Vault
    syncSettings: (): Promise<boolean> =>
        ipcRenderer.invoke('vault:syncSettings'),

    // 从 Vault 加载设置
    loadSettings: (): Promise<Record<string, unknown> | null> =>
        ipcRenderer.invoke('vault:loadSettings'),

    // 保存引擎配置到 Vault
    saveEngineConfig: (config: unknown): Promise<boolean> =>
        ipcRenderer.invoke('vault:saveEngineConfig', config),

    // 从 Vault 加载引擎配置
    loadEngineConfig: (): Promise<Record<string, unknown> | null> =>
        ipcRenderer.invoke('vault:loadEngineConfig'),
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
    },

    onCycleEditorMode: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:cycleEditorMode', handler)
        return () => ipcRenderer.removeListener('shortcuts:cycleEditorMode', handler)
    },

    onToggleSmartAutocomplete: (callback: () => void): (() => void) => {
        const handler = () => callback()
        ipcRenderer.on('shortcuts:toggleSmartAutocomplete', handler)
        return () => ipcRenderer.removeListener('shortcuts:toggleSmartAutocomplete', handler)
    },

    // 同步智能续写状态到主进程菜单
    syncSmartAutocomplete: (enabled: boolean): Promise<boolean> =>
        ipcRenderer.invoke('menu:syncSmartAutocomplete', enabled)
})

// 暴露外部文件打开 API（用于文件关联功能）
contextBridge.exposeInMainWorld('externalFile', {
    // 监听从系统打开的外部文件
    onOpenExternalFile: (callback: (filePath: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
        ipcRenderer.on('open-external-file', handler)
        return () => ipcRenderer.removeListener('open-external-file', handler)
    },

    // 获取启动时的外部文件路径（用于应用启动后查询）
    getExternalFilePath: (): Promise<string | null> =>
        ipcRenderer.invoke('fs:getExternalFilePath')
})

console.log('🔗 Preload 脚本已加载')

