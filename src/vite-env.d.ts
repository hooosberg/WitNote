/// <reference types="vite/client" />

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
}

// 文件系统 API
interface FileSystemAPI {
    getVaultPath(): Promise<string | null>
    setVaultPath(path: string): Promise<boolean>
    selectDirectory(): Promise<string | null>
    disconnectVault(): Promise<boolean>
    readDirectory(path?: string): Promise<FileNode[]>
    readFile(path: string): Promise<string>
    writeFile(path: string, content: string): Promise<boolean>
    createFile(path: string): Promise<boolean>
    createDirectory(path: string): Promise<boolean>
    deleteFile(path: string): Promise<boolean>
    renameFile(oldPath: string, newPath: string): Promise<boolean>
    watch(path?: string): Promise<boolean>
    unwatch(): Promise<boolean>
    onFileChange(callback: (event: FileChangeEvent) => void): () => void
}

// 聊天存储 API
interface ChatStorageAPI {
    load(filePath: string): Promise<unknown[]>
    save(filePath: string, messages: unknown[]): Promise<boolean>
}

// 平台信息 API
interface PlatformAPI {
    os: string
    isMac: boolean
    isWindows: boolean
}

// 窗口控制 API
interface AppWindowAPI {
    setWidth(width: number): Promise<boolean>
}

// 设置 API
interface SettingsAPI {
    get(): Promise<Record<string, unknown>>
    set(key: string, value: unknown): Promise<boolean>
    reset(): Promise<boolean>
}

// Ollama API
interface OllamaAPI {
    openModelsFolder(): Promise<string>
    pullModel(modelName: string): Promise<{ success: boolean; output: string }>
    deleteModel(modelName: string): Promise<{ success: boolean }>
    cancelPull(modelName?: string): Promise<{ success: boolean; cancelled?: string }>
    listModels(): Promise<{ success: boolean; models: Array<{ name: string; id: string; size: string; modified: string }> }>
    onPullProgress(callback: (data: { model: string; output: string }) => void): () => void
}

// 全局 Window 接口扩展
declare global {
    interface Window {
        fs: FileSystemAPI
        chat: ChatStorageAPI
        platform: PlatformAPI
        appWindow: AppWindowAPI
        settings: SettingsAPI
        ollama: OllamaAPI
    }
}

export { }

