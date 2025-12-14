/**
 * Electron 主进程
 * 包含 IPC 通信、文件系统操作、chokidar 监听
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename, extname, relative } from 'path'
import { promises as fs, existsSync, mkdirSync } from 'fs'
import Store from 'electron-store'
import chokidar from 'chokidar'

// 禁用 GPU 沙箱以支持 WebGPU (WebLLM 需要)
app.commandLine.appendSwitch('enable-features', 'Vulkan')
app.commandLine.appendSwitch('use-vulkan')
app.commandLine.appendSwitch('enable-unsafe-webgpu')

// 开发服务器 URL (由 vite-plugin-electron 注入)
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// 持久化存储
const store = new Store<{ vaultPath: string | null }>({
    defaults: { vaultPath: null }
})

// 文件监听器
let watcher: chokidar.FSWatcher | null = null

// 忽略的文件/文件夹
const IGNORED_PATTERNS = [
    '.DS_Store',
    '.git',
    'node_modules',
    '.zennote',
    '*.swp',
    '*.swo',
    '*~'
]

let mainWindow: BrowserWindow | null = null

// ============ 文件系统类型 ============

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    extension?: string
}

// ============ 文件系统工具函数 ============

/**
 * 判断是否应该忽略该文件/文件夹
 */
function shouldIgnore(name: string): boolean {
    if (name.startsWith('.')) return true
    return IGNORED_PATTERNS.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
            return regex.test(name)
        }
        return name === pattern
    })
}

/**
 * 递归读取目录树
 */
async function readDirectoryTree(dirPath: string, rootPath: string): Promise<FileNode[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const entry of entries) {
        if (shouldIgnore(entry.name)) continue

        const fullPath = join(dirPath, entry.name)
        const relativePath = relative(rootPath, fullPath)

        if (entry.isDirectory()) {
            const children = await readDirectoryTree(fullPath, rootPath)
            nodes.push({
                name: entry.name,
                path: relativePath,
                isDirectory: true,
                children
            })
        } else {
            const ext = extname(entry.name).toLowerCase()
            // 只显示文本文件
            if (['.txt', '.md', '.markdown'].includes(ext)) {
                nodes.push({
                    name: entry.name,
                    path: relativePath,
                    isDirectory: false,
                    extension: ext
                })
            }
        }
    }

    // 排序: 文件夹在前，然后按名称
    return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
    })
}

/**
 * 确保 .zennote 目录存在
 */
function ensureZenNoteDir(vaultPath: string): void {
    const zennotePath = join(vaultPath, '.zennote')
    const chatsPath = join(zennotePath, 'chats')

    if (!existsSync(zennotePath)) {
        mkdirSync(zennotePath, { recursive: true })
    }
    if (!existsSync(chatsPath)) {
        mkdirSync(chatsPath, { recursive: true })
    }
}

// ============ IPC 处理器 ============

function setupIpcHandlers() {
    // 获取 Vault 路径
    ipcMain.handle('fs:getVaultPath', () => {
        return store.get('vaultPath')
    })

    // 设置 Vault 路径
    ipcMain.handle('fs:setVaultPath', (_event, path: string) => {
        store.set('vaultPath', path)
        ensureZenNoteDir(path)
        return true
    })

    // 选择目录
    ipcMain.handle('fs:selectDirectory', async () => {
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openDirectory', 'createDirectory'],
            title: '选择笔记存储目录',
            buttonLabel: '选择此文件夹'
        })

        if (result.canceled || result.filePaths.length === 0) {
            return null
        }

        const selectedPath = result.filePaths[0]
        store.set('vaultPath', selectedPath)
        ensureZenNoteDir(selectedPath)
        return selectedPath
    })

    // 读取目录树
    ipcMain.handle('fs:readDirectory', async (_event, path?: string) => {
        const vaultPath = path || store.get('vaultPath')
        if (!vaultPath) return []

        try {
            return await readDirectoryTree(vaultPath, vaultPath)
        } catch (error) {
            console.error('读取目录失败:', error)
            return []
        }
    })

    // 读取文件
    ipcMain.handle('fs:readFile', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)
        return await fs.readFile(fullPath, 'utf-8')
    })

    // 写入文件
    ipcMain.handle('fs:writeFile', async (_event, relativePath: string, content: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)
        await fs.writeFile(fullPath, content, 'utf-8')
        return true
    })

    // 创建文件
    ipcMain.handle('fs:createFile', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)
        await fs.writeFile(fullPath, '', 'utf-8')
        return true
    })

    // 创建文件夹
    ipcMain.handle('fs:createDirectory', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)
        await fs.mkdir(fullPath, { recursive: true })
        return true
    })

    // 删除文件或文件夹
    ipcMain.handle('fs:deleteFile', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)

        // 检查是文件还是文件夹
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
            // 递归删除文件夹
            await fs.rm(fullPath, { recursive: true, force: true })
        } else {
            // 删除文件
            await fs.unlink(fullPath)
        }
        return true
    })

    // 重命名文件
    ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newPath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullOldPath = join(vaultPath, oldPath)
        const fullNewPath = join(vaultPath, newPath)
        await fs.rename(fullOldPath, fullNewPath)
        return true
    })

    // 读取聊天记录
    ipcMain.handle('chat:load', async (_event, filePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return []

        const chatKey = Buffer.from(filePath).toString('base64').replace(/[\/+=]/g, '_')
        const chatPath = join(vaultPath, '.zennote', 'chats', `${chatKey}.json`)

        try {
            const content = await fs.readFile(chatPath, 'utf-8')
            return JSON.parse(content)
        } catch {
            return []
        }
    })

    // 保存聊天记录
    ipcMain.handle('chat:save', async (_event, filePath: string, messages: unknown[]) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return false

        ensureZenNoteDir(vaultPath)

        const chatKey = Buffer.from(filePath).toString('base64').replace(/[\/+=]/g, '_')
        const chatPath = join(vaultPath, '.zennote', 'chats', `${chatKey}.json`)

        await fs.writeFile(chatPath, JSON.stringify(messages, null, 2), 'utf-8')
        return true
    })

    // 启动文件监听
    ipcMain.handle('fs:watch', (_event, path?: string) => {
        const vaultPath = path || store.get('vaultPath')
        if (!vaultPath) return false

        // 关闭旧的监听器
        if (watcher) {
            watcher.close()
        }

        // 创建新的监听器
        watcher = chokidar.watch(vaultPath, {
            ignored: (filePath) => {
                const name = basename(filePath)
                return shouldIgnore(name)
            },
            persistent: true,
            ignoreInitial: true,
            depth: 10
        })

        watcher.on('add', (filePath) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'add', path: relativePath })
        })

        watcher.on('unlink', (filePath) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'unlink', path: relativePath })
        })

        watcher.on('change', (filePath) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'change', path: relativePath })
        })

        watcher.on('addDir', (filePath) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'addDir', path: relativePath })
        })

        watcher.on('unlinkDir', (filePath) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'unlinkDir', path: relativePath })
        })

        console.log('📂 开始监听目录:', vaultPath)
        return true
    })

    // 停止文件监听
    ipcMain.handle('fs:unwatch', () => {
        if (watcher) {
            watcher.close()
            watcher = null
            console.log('📂 停止监听目录')
        }
        return true
    })
}

// ============ 窗口创建 ============

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,

        // macOS 原生视觉效果
        vibrancy: 'sidebar',
        visualEffectState: 'active',
        transparent: true,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 20, y: 18 },

        // 窗口圆角
        frame: false,
        hasShadow: true,

        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            experimentalFeatures: true
        }
    })

    // 开发模式连接 Vite 开发服务器
    if (VITE_DEV_SERVER_URL) {
        console.log('🔗 开发模式: 连接到', VITE_DEV_SERVER_URL)
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        console.log('📦 生产模式: 加载本地文件')
        mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ 页面加载完成')
    })
}

// ============ 应用启动 ============

app.whenReady().then(() => {
    setupIpcHandlers()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (watcher) {
        watcher.close()
    }
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

console.log('🧘 禅意笔记本启动中...')
console.log('📊 VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL || '未设置 (生产模式)')
