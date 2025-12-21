/**
 * Electron 主进程
 * 包含 IPC 通信、文件系统操作、chokidar 监听
 */

import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import { join, basename, extname, relative } from 'path'
import { promises as fs, existsSync, mkdirSync } from 'fs'
import Store from 'electron-store'
import * as chokidar from 'chokidar'
import { spawn } from 'child_process'

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

// 设置存储
interface AppSettings {
    theme: 'light' | 'dark' | 'tea'
    fontFamily: 'system' | 'serif'
    fontSize: number
    ollamaBaseUrl: string
    ollamaEnabled: boolean
    preferredEngine: 'ollama' | 'webllm'
    autoFallback: boolean
    customSystemPrompt: string
    promptTemplates: Array<{ id: string; name: string; content: string }>
    defaultFormat: 'txt' | 'md'
    smartFormatConversion: boolean
}

const settingsStore = new Store<AppSettings>({
    name: 'settings',
    defaults: {
        theme: 'light',
        fontFamily: 'system',
        fontSize: 17,
        ollamaBaseUrl: 'http://localhost:11434',
        ollamaEnabled: true,
        preferredEngine: 'ollama',
        autoFallback: true,
        customSystemPrompt: '',
        promptTemplates: [],
        defaultFormat: 'md',
        smartFormatConversion: true
    }
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
let ollamaProcess: ReturnType<typeof spawn> | null = null

// ============ Ollama 服务管理 ============

// 获取 Ollama 路径
function getOllamaPath(): string {
    if (app.isPackaged) {
        if (process.platform === 'darwin') {
            return join(process.resourcesPath, 'ollama', 'mac', 'ollama')
        }
        if (process.platform === 'win32') {
            return join(process.resourcesPath, 'ollama', 'win', 'ollama.exe')
        }
    }
    // 开发环境：使用绝对路径
    const { resolve } = require('path')
    const devPath = resolve(__dirname, '../public/ollama/mac/ollama')
    console.log('📍 Ollama 开发路径:', devPath)
    if (existsSync(devPath)) {
        return devPath
    }
    console.log('⚠️ 开发路径不存在，尝试系统 ollama')
    return 'ollama' // fallback to system ollama
}

// 检测是否为 MAS 版本
function isMASBuild(): boolean {
    // MAS 版本会设置 process.mas = true (由 electron-builder 注入)
    // 也可以通过检查 entitlements 或环境变量判断
    return (process as NodeJS.Process & { mas?: boolean }).mas === true
}

// 获取模型目录
function getModelsPath(): string {
    // MAS 沙盒兼容：使用用户数据目录 (可写)
    if (isMASBuild()) {
        return join(app.getPath('userData'), 'ollama-models')
    }

    // DMG 版本：使用资源目录 (只读，模型已预装)
    if (app.isPackaged) {
        return join(process.resourcesPath, 'models', 'ollama-models')
    }

    // 开发环境
    const { resolve } = require('path')
    return resolve(__dirname, '../public/models/ollama-models')
}

// 获取内置模型路径 (从 app bundle 中)
function getBundledModelsPath(): string {
    return join(process.resourcesPath, 'models', 'ollama-models')
}

// MAS 首次启动：将内置模型复制到用户目录
async function ensureModelsForMAS(): Promise<void> {
    if (!isMASBuild()) return

    const targetPath = getModelsPath()
    const bundledPath = getBundledModelsPath()

    // 如果用户目录已有模型，跳过
    if (existsSync(targetPath)) {
        console.log('✅ MAS 模型目录已存在:', targetPath)
        return
    }

    // 检查内置模型是否存在
    if (!existsSync(bundledPath)) {
        console.log('⚠️ 未找到内置模型:', bundledPath)
        return
    }

    console.log('📦 MAS 首次运行：复制内置模型到用户目录...')
    console.log('   源:', bundledPath)
    console.log('   目标:', targetPath)

    try {
        // 递归复制目录
        await copyDirectory(bundledPath, targetPath)
        console.log('✅ 模型复制完成')
    } catch (error) {
        console.error('❌ 模型复制失败:', error)
    }
}

// 递归复制目录
async function copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    const entries = await fs.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath)
        } else {
            await fs.copyFile(srcPath, destPath)
        }
    }
}

// 启动内置 Ollama 服务
async function startOllama(): Promise<void> {
    const ollamaPath = getOllamaPath()
    const modelsPath = getModelsPath()

    console.log('🤖 准备启动 Ollama...')
    console.log('   路径:', ollamaPath)
    console.log('   模型目录:', modelsPath)

    // 检查是否已有 Ollama 在运行
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags')
        if (response.ok) {
            console.log('✅ Ollama 已在运行')
            return
        }
    } catch {
        // Ollama 未运行，继续启动
    }

    const env = {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_MODELS: modelsPath
    }

    try {
        ollamaProcess = spawn(ollamaPath, ['serve'], {
            env,
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
        })

        ollamaProcess.stdout?.on('data', (data: Buffer) => {
            console.log('[Ollama]', data.toString().trim())
        })

        ollamaProcess.stderr?.on('data', (data: Buffer) => {
            console.log('[Ollama]', data.toString().trim())
        })

        ollamaProcess.on('error', (error: Error) => {
            console.error('❌ Ollama 启动失败:', error.message)
        })

        ollamaProcess.on('exit', (code: number | null) => {
            console.log('📤 Ollama 已退出, code:', code)
            ollamaProcess = null
        })

        // 等待 Ollama 启动
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('✅ Ollama 启动成功')
    } catch (error) {
        console.error('❌ 启动 Ollama 失败:', error)
    }
}

// 停止 Ollama 服务
function stopOllama(): void {
    if (ollamaProcess) {
        console.log('🛑 停止 Ollama...')
        ollamaProcess.kill()
        ollamaProcess = null
    }
}

// ============ 文件系统类型 ============

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    extension?: string
    modifiedAt?: number  // 修改时间戳（毫秒）
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
        const stat = await fs.stat(fullPath)

        if (entry.isDirectory()) {
            const children = await readDirectoryTree(fullPath, rootPath)
            nodes.push({
                name: entry.name,
                path: relativePath,
                isDirectory: true,
                children,
                modifiedAt: stat.mtimeMs
            })
        } else {
            const ext = extname(entry.name).toLowerCase()
            // 只显示文本文件
            if (['.txt', '.md', '.markdown'].includes(ext)) {
                nodes.push({
                    name: entry.name,
                    path: relativePath,
                    isDirectory: false,
                    extension: ext,
                    modifiedAt: stat.mtimeMs
                })
            }
        }
    }

    // 排序: 文件夹在前按名称排序，文件按修改时间倒序
    return nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        // 文件夹按名称字母顺序排序（避免因修改时间变化导致位置改变）
        if (a.isDirectory && b.isDirectory) {
            return a.name.localeCompare(b.name, 'zh-CN')
        }
        // 文件按修改时间倒序
        return (b.modifiedAt || 0) - (a.modifiedAt || 0)
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
    // 获取 Vault 路径（自动检测文件夹是否存在）
    ipcMain.handle('fs:getVaultPath', () => {
        const vaultPath = store.get('vaultPath')
        if (vaultPath) {
            // 检测文件夹是否存在
            if (!existsSync(vaultPath)) {
                console.log('⚠️ Vault 文件夹不存在，自动清除配置:', vaultPath)
                store.set('vaultPath', null)
                return null
            }
        }
        return vaultPath
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

    // 断开连接（清除存储的路径）
    ipcMain.handle('fs:disconnectVault', async () => {
        store.delete('vaultPath')
        return true
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

        watcher.on('add', (filePath: string) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'add', path: relativePath })
        })

        watcher.on('unlink', (filePath: string) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'unlink', path: relativePath })
        })

        watcher.on('change', (filePath: string) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'change', path: relativePath })
        })

        watcher.on('addDir', (filePath: string) => {
            const relativePath = relative(vaultPath, filePath)
            mainWindow?.webContents.send('fs:change', { type: 'addDir', path: relativePath })
        })

        watcher.on('unlinkDir', (filePath: string) => {
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

    // 调整窗口宽度
    ipcMain.handle('window:setWidth', (_event, width: number) => {
        if (mainWindow) {
            const bounds = mainWindow.getBounds()
            mainWindow.setBounds({ ...bounds, width })
            return true
        }
        return false
    })

    // ============ 应用信息 IPC 处理器 ============

    // 获取应用版本号
    ipcMain.handle('app:getVersion', () => {
        return app.getVersion()
    })

    // ============ 设置 IPC 处理器 ============

    // 获取所有设置
    ipcMain.handle('settings:get', () => {
        return settingsStore.store
    })

    // 设置单个配置项
    ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
        settingsStore.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings])
        return true
    })

    // 重置所有设置
    ipcMain.handle('settings:reset', () => {
        settingsStore.clear()
        return true
    })

    // ============ Ollama 模型管理 IPC 处理器 ============
    // 使用模块顶部定义的 getOllamaPath() 和 getModelsPath()

    const ollamaEnv = {
        ...process.env,
        OLLAMA_HOST: '127.0.0.1:11434',
        OLLAMA_MODELS: getModelsPath()
    }

    // 打开模型目录
    ipcMain.handle('ollama:openModelsFolder', () => {
        const modelsPath = getModelsPath()
        shell.openPath(modelsPath)
        return modelsPath
    })

    // 获取已安装模型列表
    ipcMain.handle('ollama:listModels', async () => {
        try {
            const ollamaPath = getOllamaPath()
            return new Promise((resolve) => {
                const cmd = spawn(ollamaPath, ['list'], { env: ollamaEnv })
                let output = ''
                cmd.stdout.on('data', (data: Buffer) => {
                    output += data.toString()
                })
                cmd.on('close', (code: number) => {
                    if (code === 0) {
                        try {
                            const lines = output.trim().split('\n').slice(1)
                            const models = lines.map(line => {
                                const parts = line.split(/\s{2,}/)
                                if (parts.length >= 3) {
                                    return {
                                        name: parts[0],
                                        id: parts[1],
                                        size: parts[2],
                                        modified: parts[3] || ''
                                    }
                                }
                                return null
                            }).filter(m => m !== null)
                            resolve({ success: true, models })
                        } catch {
                            resolve({ success: false, error: '解析模型列表失败' })
                        }
                    } else {
                        resolve({ success: false, error: '获取模型列表失败' })
                    }
                })
                cmd.on('error', (err: Error) => {
                    resolve({ success: false, error: err.message })
                })
            })
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    })
    // 存储当前下载进程引用 - 使用 Map 支持多模型并行下载
    const pullProcesses = new Map<string, ReturnType<typeof spawn>>();

    // 下载模型
    ipcMain.handle('ollama:pullModel', async (_event, modelName: string) => {
        return new Promise((resolve, reject) => {
            const ollamaPath = getOllamaPath()
            const pullProcess = spawn(ollamaPath, ['pull', modelName], { env: ollamaEnv })

            // 存储进程引用
            pullProcesses.set(modelName, pullProcess)

            let output = ''
            pullProcess.stdout?.on('data', (data: Buffer) => {
                const text = data.toString()
                output += text
                mainWindow?.webContents.send('ollama:pullProgress', { model: modelName, output: text })
            })
            pullProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString()
                output += text
                mainWindow?.webContents.send('ollama:pullProgress', { model: modelName, output: text })
            })
            pullProcess.on('close', (code: number) => {
                // 清理进程引用
                pullProcesses.delete(modelName)
                if (code === 0) {
                    resolve({ success: true, output })
                } else {
                    reject(new Error(`下载失败，退出码: ${code}`))
                }
            })
            pullProcess.on('error', (error: Error) => {
                pullProcesses.delete(modelName)
                reject(error)
            })
        })
    })

    // 取消下载 - 支持指定模型名
    ipcMain.handle('ollama:cancelPull', async (_event, modelName?: string) => {
        // 如果指定了模型名，取消特定模型的下载
        if (modelName && pullProcesses.has(modelName)) {
            console.log(`🛑 取消下载: ${modelName}`)
            const process = pullProcesses.get(modelName)!
            process.kill('SIGTERM')
            pullProcesses.delete(modelName)

            // 删除未完成的模型文件
            try {
                const ollamaPath = getOllamaPath()
                spawn(ollamaPath, ['rm', modelName], { env: ollamaEnv })
                console.log(`🗑️ 已清理未完成的模型: ${modelName}`)
            } catch (e) {
                console.log('清理未完成模型失败:', e)
            }

            return { success: true, cancelled: modelName }
        }

        // 如果没有指定模型名，取消所有下载（向后兼容）
        if (pullProcesses.size > 0) {
            const cancelledModels: string[] = []
            const ollamaPath = getOllamaPath()

            Array.from(pullProcesses.entries()).forEach(([name, proc]) => {
                console.log(`🛑 取消下载: ${name}`)
                proc.kill('SIGTERM')
                cancelledModels.push(name)

                // 删除未完成的模型文件
                try {
                    spawn(ollamaPath, ['rm', name], { env: ollamaEnv })
                    console.log(`🗑️ 已清理未完成的模型: ${name}`)
                } catch (e) {
                    console.log('清理未完成模型失败:', e)
                }
            })

            pullProcesses.clear()
            return { success: true, cancelled: cancelledModels.join(', ') }
        }

        return { success: false, error: '没有正在进行的下载' }
    })

    // 删除模型
    ipcMain.handle('ollama:deleteModel', async (_event, modelName: string) => {
        return new Promise((resolve, reject) => {
            const ollamaPath = getOllamaPath()
            const deleteProcess = spawn(ollamaPath, ['rm', modelName], { env: ollamaEnv })
            deleteProcess.on('close', (code: number) => {
                if (code === 0) {
                    resolve({ success: true })
                } else {
                    reject(new Error(`删除失败，退出码: ${code}`))
                }
            })
            deleteProcess.on('error', (error: Error) => reject(error))
        })
    })
}

// ============ 窗口创建 ============

function createWindow() {
    // 根据平台设置窗口选项
    const isMac = process.platform === 'darwin'

    const windowOptions: Electron.BrowserWindowConstructorOptions = {
        width: 1400,
        height: 900,
        minWidth: 400,  // 允许更小的窗口（触发专注模式）
        minHeight: 300,
        hasShadow: true,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
            experimentalFeatures: true
        }
    }

    // macOS 专用原生视觉效果
    if (isMac) {
        Object.assign(windowOptions, {
            vibrancy: 'sidebar',
            visualEffectState: 'active',
            transparent: true,
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 20, y: 18 },
            frame: false
        })
    } else {
        // Windows / Linux 使用默认窗口框架
        Object.assign(windowOptions, {
            frame: true,
            transparent: false
        })
    }

    mainWindow = new BrowserWindow(windowOptions)

    // Windows 上移除菜单栏，只保留标题栏
    if (!isMac) {
        Menu.setApplicationMenu(null)
    }

    // 开发模式连接 Vite 开发服务器
    if (VITE_DEV_SERVER_URL) {
        console.log('🔗 开发模式: 连接到', VITE_DEV_SERVER_URL)
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        // 生产模式: 加载 asar 包中的 dist/index.html
        const indexPath = join(app.getAppPath(), 'dist', 'index.html')
        console.log('📦 生产模式: 加载', indexPath)
        mainWindow.loadFile(indexPath)
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ 页面加载完成')
    })
}

// ============ 应用启动 ============

app.whenReady().then(async () => {
    // MAS 版本：首次启动时复制内置模型到用户目录
    await ensureModelsForMAS()

    // 启动 Ollama 服务
    await startOllama()

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
    stopOllama()
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

console.log('🧘 智简笔记本启动中...')
console.log('📊 VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL || '未设置 (生产模式)')
