/**
 * Electron 主进程
 * 包含 IPC 通信、文件系统操作、chokidar 监听
 */

import { app, BrowserWindow, ipcMain, dialog, shell, Menu, protocol, net } from 'electron'
import { join, basename, extname, relative, dirname } from 'path'
import { promises as fs, existsSync, mkdirSync, readFileSync } from 'fs'
import Store from 'electron-store'
import * as chokidar from 'chokidar'
import { spawn } from 'child_process'
import { createHash } from 'crypto'

// 检测是否在 Mac App Store 沙盒环境中运行
const isMAS = (process as NodeJS.Process & { mas?: boolean }).mas === true

// 禁用 GPU 沙箱以支持 WebGPU (WebLLM 需要，仅非 Windows 平台)
// Windows 版本不支持 WebLLM，无需这些参数
if (process.platform !== 'win32') {
    app.commandLine.appendSwitch('enable-features', 'Vulkan')
    app.commandLine.appendSwitch('use-vulkan')
    app.commandLine.appendSwitch('enable-unsafe-webgpu')
}

// 开发服务器 URL (由 vite-plugin-electron 注入)
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// 持久化存储
const store = new Store<{ vaultPath: string | null; vaultBookmark: string | null }>({
    defaults: { vaultPath: null, vaultBookmark: null }
})

// 全局变量：当前活跃的 security-scoped 资源访问函数 (MAS 沙盒需要)
let stopAccessingResource: (() => void) | null = null

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

// ============ 菜单多语言支持 ============

/**
 * 菜单翻译数据 - 支持 8 种语言
 */
const allMenuTranslations: Record<string, any> = {
    zh: {
        about: '关于 {appName}',
        preferences: '偏好设置...',
        services: '服务',
        hide: '隐藏 {appName}',
        hideOthers: '隐藏其他',
        unhide: '显示全部',
        quit: '退出 {appName}',
        file: '文件',
        newArticle: '新建文章',
        newFolder: '新建文件夹',
        closeWindow: '关闭窗口',
        edit: '编辑',
        undo: '撤销',
        redo: '重做',
        cut: '剪切',
        copy: '复制',
        paste: '粘贴',
        pasteAndMatchStyle: '粘贴并匹配样式',
        delete: '删除',
        selectAll: '全选',
        view: '视图',
        focusMode: '专注模式',
        cycleEditorMode: '切换编辑模式',
        reload: '刷新',
        forceReload: '强制刷新',
        devTools: '开发者工具',
        actualSize: '实际大小',
        zoomIn: '放大',
        zoomOut: '缩小',
        fullscreen: '全屏',
        window: '窗口',
        minimize: '最小化',
        zoom: '缩放',
        front: '前置全部窗口',
        close: '关闭',
        help: '帮助',
        visitGitHub: '访问 GitHub',
        openSettings: '打开设置',
        toggleFocusMode: '切换专注模式',
        showMainWindow: '显示主窗口',
        enableSmartAutocomplete: '开启智能续写',
        disableSmartAutocomplete: '关闭智能续写'
    },
    'zh-TW': {
        about: '關於 {appName}',
        preferences: '偏好設定...',
        services: '服務',
        hide: '隱藏 {appName}',
        hideOthers: '隱藏其他',
        unhide: '顯示全部',
        quit: '結束 {appName}',
        file: '檔案',
        newArticle: '新建文章',
        newFolder: '新建資料夾',
        closeWindow: '關閉視窗',
        edit: '編輯',
        undo: '還原',
        redo: '重做',
        cut: '剪下',
        copy: '複製',
        paste: '貼上',
        pasteAndMatchStyle: '貼上並符合樣式',
        delete: '刪除',
        selectAll: '全選',
        view: '檢視',
        focusMode: '專注模式',
        reload: '重新載入',
        forceReload: '強制重新載入',
        devTools: '開發人員工具',
        actualSize: '實際大小',
        zoomIn: '放大',
        zoomOut: '縮小',
        fullscreen: '全螢幕',
        window: '視窗',
        minimize: '最小化',
        zoom: '縮放',
        front: '將全部移到最前面',
        close: '關閉',
        help: '說明',
        visitGitHub: '造訪 GitHub',
        openSettings: '開啟設定',
        toggleFocusMode: '切換專注模式',
        showMainWindow: '顯示主視窗',
        enableSmartAutocomplete: '開啟智能續寫',
        disableSmartAutocomplete: '關閉智能續寫'
    },
    en: {
        about: 'About {appName}',
        preferences: 'Preferences...',
        services: 'Services',
        hide: 'Hide {appName}',
        hideOthers: 'Hide Others',
        unhide: 'Show All',
        quit: 'Quit {appName}',
        file: 'File',
        newArticle: 'New Article',
        newFolder: 'New Folder',
        closeWindow: 'Close Window',
        edit: 'Edit',
        undo: 'Undo',
        redo: 'Redo',
        cut: 'Cut',
        copy: 'Copy',
        paste: 'Paste',
        pasteAndMatchStyle: 'Paste and Match Style',
        delete: 'Delete',
        selectAll: 'Select All',
        view: 'View',
        focusMode: 'Focus Mode',
        cycleEditorMode: 'Cycle Editor Mode',
        reload: 'Reload',
        forceReload: 'Force Reload',
        devTools: 'Developer Tools',
        actualSize: 'Actual Size',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out',
        fullscreen: 'Toggle Fullscreen',
        window: 'Window',
        minimize: 'Minimize',
        zoom: 'Zoom',
        front: 'Bring All to Front',
        close: 'Close',
        help: 'Help',
        visitGitHub: 'Visit GitHub',
        openSettings: 'Open Settings',
        toggleFocusMode: 'Toggle Focus Mode',
        showMainWindow: 'Show Main Window',
        enableSmartAutocomplete: 'Enable Smart Autocomplete',
        disableSmartAutocomplete: 'Disable Smart Autocomplete'
    },
    ja: {
        about: '{appName} について',
        preferences: '環境設定...',
        services: 'サービス',
        hide: '{appName} を隠す',
        hideOthers: 'ほかを隠す',
        unhide: 'すべてを表示',
        quit: '{appName} を終了',
        file: 'ファイル',
        newArticle: '新規記事',
        newFolder: '新規フォルダ',
        closeWindow: 'ウィンドウを閉じる',
        edit: '編集',
        undo: '取り消す',
        redo: 'やり直す',
        cut: 'カット',
        copy: 'コピー',
        paste: 'ペースト',
        pasteAndMatchStyle: 'ペーストしてスタイルを合わせる',
        delete: '削除',
        selectAll: 'すべてを選択',
        view: '表示',
        focusMode: '集中モード',
        reload: '再読み込み',
        forceReload: '強制再読み込み',
        devTools: '開発者ツール',
        actualSize: '実際のサイズ',
        zoomIn: '拡大',
        zoomOut: '縮小',
        fullscreen: 'フルスクリーン',
        window: 'ウィンドウ',
        minimize: '最小化',
        zoom: '拡大/縮小',
        front: 'すべてを手前に移動',
        close: '閉じる',
        help: 'ヘルプ',
        visitGitHub: 'GitHub を開く',
        openSettings: '設定を開く',
        toggleFocusMode: '集中モードを切り替え',
        showMainWindow: 'メインウィンドウを表示',
        enableSmartAutocomplete: 'スマート入力補完を有効化',
        disableSmartAutocomplete: 'スマート入力補完を無効化'
    },
    ko: {
        about: '{appName} 정보',
        preferences: '환경설정...',
        services: '서비스',
        hide: '{appName} 숨기기',
        hideOthers: '기타 숨기기',
        unhide: '모두 표시',
        quit: '{appName} 종료',
        file: '파일',
        newArticle: '새 글',
        newFolder: '새 폴더',
        closeWindow: '창 닫기',
        edit: '편집',
        undo: '실행 취소',
        redo: '다시 실행',
        cut: '오려두기',
        copy: '복사',
        paste: '붙여넣기',
        pasteAndMatchStyle: '붙여넣고 스타일 맞추기',
        delete: '삭제',
        selectAll: '모두 선택',
        view: '보기',
        focusMode: '집중 모드',
        reload: '새로 고침',
        forceReload: '강제 새로 고침',
        devTools: '개발자 도구',
        actualSize: '실제 크기',
        zoomIn: '확대',
        zoomOut: '축소',
        fullscreen: '전체 화면',
        window: '창',
        minimize: '최소화',
        zoom: '확대/축소',
        front: '모두 앞으로 가져오기',
        close: '닫기',
        help: '도움말',
        visitGitHub: 'GitHub 방문',
        openSettings: '설정 열기',
        toggleFocusMode: '집중 모드 전환',
        showMainWindow: '메인 윈도우 표시',
        enableSmartAutocomplete: '스마트 자동완성 활성화',
        disableSmartAutocomplete: '스마트 자동완성 비활성화'
    },
    fr: {
        about: 'À propos de {appName}',
        preferences: 'Préférences...',
        services: 'Services',
        hide: 'Masquer {appName}',
        hideOthers: 'Masquer les autres',
        unhide: 'Tout afficher',
        quit: 'Quitter {appName}',
        file: 'Fichier',
        newArticle: 'Nouvel Article',
        newFolder: 'Nouveau Dossier',
        closeWindow: 'Fermer la fenêtre',
        edit: 'Édition',
        undo: 'Annuler',
        redo: 'Rétablir',
        cut: 'Couper',
        copy: 'Copier',
        paste: 'Coller',
        pasteAndMatchStyle: 'Coller et adapter le style',
        delete: 'Supprimer',
        selectAll: 'Tout sélectionner',
        view: 'Présentation',
        focusMode: 'Mode Focus',
        reload: 'Actualiser',
        forceReload: "Forcer l'actualisation",
        devTools: 'Outils de développement',
        actualSize: 'Taille réelle',
        zoomIn: 'Zoom avant',
        zoomOut: 'Zoom arrière',
        fullscreen: 'Plein écran',
        window: 'Fenêtre',
        minimize: 'Réduire',
        zoom: 'Zoom',
        front: 'Tout ramener au premier plan',
        close: 'Fermer',
        help: 'Aide',
        visitGitHub: 'Visiter GitHub',
        openSettings: 'Ouvrir les Paramètres',
        toggleFocusMode: 'Basculer Mode Focus',
        showMainWindow: 'Afficher la fenêtre principale',
        enableSmartAutocomplete: 'Activer Auto-complétion Intelligente',
        disableSmartAutocomplete: 'Désactiver Auto-complétion Intelligente'
    },
    de: {
        about: 'Über {appName}',
        preferences: 'Einstellungen...',
        services: 'Dienste',
        hide: '{appName} ausblenden',
        hideOthers: 'Andere ausblenden',
        unhide: 'Alle einblenden',
        quit: '{appName} beenden',
        file: 'Ablage',
        newArticle: 'Neuer Artikel',
        newFolder: 'Neuer Ordner',
        closeWindow: 'Fenster schließen',
        edit: 'Bearbeiten',
        undo: 'Widerrufen',
        redo: 'Wiederholen',
        cut: 'Ausschneiden',
        copy: 'Kopieren',
        paste: 'Einfügen',
        pasteAndMatchStyle: 'Einsetzen und Stil anpassen',
        delete: 'Löschen',
        selectAll: 'Alles auswählen',
        view: 'Darstellung',
        focusMode: 'Fokus-Modus',
        reload: 'Neu laden',
        forceReload: 'Neu laden erzwingen',
        devTools: 'Entwicklertools',
        actualSize: 'Tatsächliche Größe',
        zoomIn: 'Vergrößern',
        zoomOut: 'Verkleinern',
        fullscreen: 'Vollbild',
        window: 'Fenster',
        minimize: 'Minimieren',
        zoom: 'Zoomen',
        front: 'Alle nach vorne bringen',
        close: 'Schließen',
        help: 'Hilfe',
        visitGitHub: 'GitHub besuchen',
        openSettings: 'Einstellungen öffnen',
        toggleFocusMode: 'Fokus-Modus umschalten',
        showMainWindow: 'Hauptfenster anzeigen',
        enableSmartAutocomplete: 'Intelligente Autovervollständigung aktivieren',
        disableSmartAutocomplete: 'Intelligente Autovervollständigung deaktivieren'
    },
    es: {
        about: 'Acerca de {appName}',
        preferences: 'Preferencias...',
        services: 'Servicios',
        hide: 'Ocultar {appName}',
        hideOthers: 'Ocultar otros',
        unhide: 'Mostrar todo',
        quit: 'Salir de {appName}',
        file: 'Archivo',
        newArticle: 'Nuevo Artículo',
        newFolder: 'Nueva Carpeta',
        closeWindow: 'Cerrar ventana',
        edit: 'Edición',
        undo: 'Deshacer',
        redo: 'Rehacer',
        cut: 'Cortar',
        copy: 'Copiar',
        paste: 'Pegar',
        pasteAndMatchStyle: 'Pegar y ajustar estilo',
        delete: 'Eliminar',
        selectAll: 'Seleccionar todo',
        view: 'Vista',
        focusMode: 'Modo Enfoque',
        reload: 'Recargar',
        forceReload: 'Forzar recarga',
        devTools: 'Herramientas de desarrollo',
        actualSize: 'Tamaño real',
        zoomIn: 'Ampliar',
        zoomOut: 'Reducir',
        fullscreen: 'Pantalla completa',
        window: 'Ventana',
        minimize: 'Minimizar',
        zoom: 'Zoom',
        front: 'Traer todo al frente',
        close: 'Cerrar',
        help: 'Ayuda',
        visitGitHub: 'Visitar GitHub',
        openSettings: 'Abrir Ajustes',
        toggleFocusMode: 'Alternar Modo Enfoque',
        showMainWindow: 'Mostrar ventana principal',
        enableSmartAutocomplete: 'Activar Autocompletado Inteligente',
        disableSmartAutocomplete: 'Desactivar Autocompletado Inteligente'
    }
}

/**
 * 检测系统语言并映射到应用支持的语言
 */
function detectSystemLanguage(): string {
    const locale = app.getLocale() // 例如: 'zh-CN', 'en-US', 'ja', 'ko'

    const languageMap: Record<string, string> = {
        'zh-CN': 'zh', 'zh-Hans': 'zh', 'zh-SG': 'zh',
        'zh-TW': 'zh-TW', 'zh-Hant': 'zh-TW', 'zh-HK': 'zh-TW', 'zh-MO': 'zh-TW',
        'en': 'en', 'en-US': 'en', 'en-GB': 'en', 'en-AU': 'en', 'en-CA': 'en',
        'ja': 'ja', 'ja-JP': 'ja',
        'ko': 'ko', 'ko-KR': 'ko',
        'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr',
        'de': 'de', 'de-DE': 'de', 'de-AT': 'de', 'de-CH': 'de',
        'es': 'es', 'es-ES': 'es', 'es-MX': 'es', 'es-AR': 'es'
    }

    // 完整匹配
    if (languageMap[locale]) return languageMap[locale]

    // 前缀匹配
    const prefix = locale.split('-')[0]
    if (languageMap[prefix]) return languageMap[prefix]

    // 默认英文
    return 'en'
}

// 当前使用的菜单翻译
let menuTranslations: any = { menu: allMenuTranslations.en }

/**
 * 加载指定语言的菜单翻译
 */
function loadMenuLanguage(lang: string) {
    const translations = allMenuTranslations[lang]
    if (translations) {
        menuTranslations = { menu: translations }
        console.log(`✓ 菜单语言: ${lang}`)
    } else {
        menuTranslations = { menu: allMenuTranslations.en }
        console.log(`⚠ 语言 ${lang} 不支持，使用英文`)
    }
}

/**
 * 菜单翻译函数 - 支持 menu.file 格式
 */
function tm(key: string, params?: { [k: string]: string }): string {
    const keys = key.split('.')
    let value: any = menuTranslations

    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k]
        } else {
            return key
        }
    }

    let str = typeof value === 'string' ? value : key

    // 替换参数
    if (params) {
        Object.keys(params).forEach(k => {
            str = str.replace(`{${k}}`, params[k])
        })
    }

    return str
}


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

// 智能续写状态（用于动态更新菜单显示）
let smartAutocompleteEnabled: boolean = true

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
            // 显示文本文件、文档文件和图片文件
            const allowedExtensions = [
                '.txt', '.md', '.markdown',  // 文本
                '.pdf', '.docx',              // 文档
                '.jpg', '.jpeg', '.png', '.gif', '.webp'  // 图片
            ]
            if (allowedExtensions.includes(ext)) {
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
    const settingsPath = join(zennotePath, 'settings')

    if (!existsSync(zennotePath)) {
        mkdirSync(zennotePath, { recursive: true })
    }
    if (!existsSync(chatsPath)) {
        mkdirSync(chatsPath, { recursive: true })
    }
    if (!existsSync(settingsPath)) {
        mkdirSync(settingsPath, { recursive: true })
    }
}


// ============ IPC 处理器 ============

function setupIpcHandlers() {
    // 获取 Vault 路径（自动检测文件夹是否存在）
    ipcMain.handle('fs:getVaultPath', () => {
        const vaultPath = store.get('vaultPath')
        const bookmark = store.get('vaultBookmark')

        if (vaultPath) {
            // 尝试恢复 security-scoped 权限 (MAS 沙盒需要)
            if (bookmark && !stopAccessingResource) {
                try {
                    stopAccessingResource = app.startAccessingSecurityScopedResource(bookmark) as () => void
                    console.log('🔓 已恢复文件夹访问权限')
                } catch (err) {
                    console.warn('⚠️ 恢复权限失败，可能需要重新选择文件夹:', err)
                }
            }

            // 检测文件夹是否存在
            if (!existsSync(vaultPath)) {
                console.log('⚠️ Vault 文件夹不存在，自动清除配置:', vaultPath)
                store.set('vaultPath', null)
                store.set('vaultBookmark', null)
                if (stopAccessingResource) {
                    stopAccessingResource()
                    stopAccessingResource = null
                }
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
            securityScopedBookmarks: true,  // 启用 security-scoped bookmarks (MAS 沙盒需要)
            title: '选择笔记存储目录',
            buttonLabel: '选择此文件夹'
        })

        if (result.canceled || result.filePaths.length === 0) {
            return null
        }

        const selectedPath = result.filePaths[0]

        // 保存 bookmark 数据 (MAS 沙盒需要持久化访问权限)
        if (result.bookmarks && result.bookmarks.length > 0) {
            store.set('vaultBookmark', result.bookmarks[0])
            console.log('📑 已保存 Security-Scoped Bookmark')
        }

        store.set('vaultPath', selectedPath)
        ensureZenNoteDir(selectedPath)
        return selectedPath
    })

    // 断开连接（清除存储的路径）
    ipcMain.handle('fs:disconnectVault', async () => {
        // 停止访问 security-scoped 资源
        if (stopAccessingResource) {
            stopAccessingResource()
            stopAccessingResource = null
            console.log('🔒 已释放文件夹访问权限')
        }

        store.delete('vaultPath')
        store.delete('vaultBookmark')
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

        // 确保父目录存在（解决 .zennote 等子目录写入问题）
        const parentDir = dirname(fullPath)
        if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true })
        }

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

    // 删除文件或文件夹（移动到系统回收站）
    ipcMain.handle('fs:deleteFile', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)

        // 使用 shell.trashItem 移动到系统回收站（macOS 废纸篓）
        // 这比永久删除更安全，用户可以从回收站中找回文件
        try {
            await shell.trashItem(fullPath)
            return true
        } catch (error) {
            console.error('移动到回收站失败，尝试永久删除:', error)
            // 如果移动到回收站失败（如某些 Linux 桌面环境不支持），回退到永久删除
            const stat = await fs.stat(fullPath)
            if (stat.isDirectory()) {
                await fs.rm(fullPath, { recursive: true, force: true })
            } else {
                await fs.unlink(fullPath)
            }
            return true
        }
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

    // 读取文件 Buffer (用于 DOCX 预览)
    ipcMain.handle('fs:readFileBuffer', async (_event, relativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        const fullPath = join(vaultPath, relativePath)
        const buffer = await fs.readFile(fullPath)
        return buffer.buffer // 返回 ArrayBuffer
    })

    // ============ 外部文件导入操作 ============

    // 复制外部文件到 Vault（用于拖拽导入）
    ipcMain.handle('fs:copyExternalFile', async (_event, externalPath: string, targetDir: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        console.log('📥 复制外部文件:', externalPath)
        console.log('  - 目标目录:', targetDir)

        // 验证文件格式
        const fileName = basename(externalPath)
        const ext = extname(fileName).toLowerCase()
        const allowedExtensions = [
            '.txt', '.md', '.markdown',  // 文本
            '.pdf', '.docx',              // 文档
            '.jpg', '.jpeg', '.png', '.gif', '.webp'  // 图片
        ]

        if (!allowedExtensions.includes(ext)) {
            console.log('  - ❌ 不支持的文件格式:', ext)
            throw new Error(`不支持的文件格式: ${ext}`)
        }

        // 检查文件是否已在 Vault 内
        const normalizedExternalPath = externalPath.replace(/\\/g, '/')
        const normalizedVaultPath = vaultPath.replace(/\\/g, '/')

        if (normalizedExternalPath.startsWith(normalizedVaultPath + '/')) {
            console.log('  - 文件已在 Vault 内，返回相对路径')
            return relative(vaultPath, externalPath)
        }

        // 确定目标目录
        const destDir = targetDir ? join(vaultPath, targetDir) : vaultPath
        if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true })
        }

        // 读取源文件用于去重检查
        const sourceBuffer = await fs.readFile(externalPath)
        const sourceHash = createHash('md5').update(sourceBuffer).digest('hex').substring(0, 8)
        console.log('  - 源文件 hash:', sourceHash)

        // 检查目标目录中是否已存在相同文件
        const baseNameWithoutExt = basename(fileName, ext)
        let destFileName = fileName
        let destPath = join(destDir, destFileName)

        // 如果文件名已存在，检查内容是否相同
        if (existsSync(destPath)) {
            const existingBuffer = await fs.readFile(destPath)
            const existingHash = createHash('md5').update(existingBuffer).digest('hex').substring(0, 8)

            if (sourceHash === existingHash) {
                console.log('  - ✨ 文件已存在且内容相同，跳过复制')
                return targetDir ? `${targetDir}/${destFileName}` : destFileName
            }

            // 内容不同，使用 hash 后缀避免覆盖
            destFileName = `${baseNameWithoutExt}_${sourceHash}${ext}`
            destPath = join(destDir, destFileName)
            console.log('  - 文件名冲突，使用新名称:', destFileName)
        }

        // 复制文件
        try {
            await fs.copyFile(externalPath, destPath)
            console.log('  - ✅ 复制成功:', destFileName)
        } catch (error) {
            console.error('  - ❌ 复制失败:', error)
            throw error
        }

        // 返回相对路径
        const relativePath = targetDir ? `${targetDir}/${destFileName}` : destFileName
        console.log('  - 返回路径:', relativePath)
        return relativePath
    })

    // ============ 图片相关操作 ============

    // 保存 Base64 图片到本地 (用于粘贴图片)
    ipcMain.handle('fs:saveImage', async (_event, relativeDirPath: string, base64Data: string, fileName?: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        // 确保图片目录存在
        const imageDir = join(vaultPath, relativeDirPath, '.images')
        if (!existsSync(imageDir)) {
            mkdirSync(imageDir, { recursive: true })
        }

        // 解析 Base64 数据
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!matches) throw new Error('无效的图片数据')

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
        const buffer = Buffer.from(matches[2], 'base64')

        // 生成文件名
        const timestamp = Date.now()
        const imageName = fileName || `image_${timestamp}.${ext}`
        const imagePath = join(imageDir, imageName)

        // 写入文件
        await fs.writeFile(imagePath, buffer)

        // 返回相对路径（用于 Markdown）
        return `.images/${imageName}`
    })

    // 选择图片文件并复制到本地
    ipcMain.handle('fs:selectAndCopyImage', async (_event, relativeDirPath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        // 打开文件选择对话框
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ['openFile'],
            filters: [
                { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] }
            ],
            title: '选择图片',
            buttonLabel: '插入图片'
        })

        if (result.canceled || result.filePaths.length === 0) {
            return null
        }

        const sourcePath = result.filePaths[0]
        const sourceFileName = basename(sourcePath)

        // 检查图片是否已经在 vault 目录内
        const normalizedSourcePath = sourcePath.replace(/\\/g, '/')
        const normalizedVaultPath = vaultPath.replace(/\\/g, '/')

        console.log('📷 图片选择调试:')
        console.log('  - 源文件路径:', sourcePath)
        console.log('  - 规范化源路径:', normalizedSourcePath)
        console.log('  - Vault 路径:', vaultPath)
        console.log('  - 规范化 Vault 路径:', normalizedVaultPath)
        console.log('  - 相对目录路径:', relativeDirPath)
        console.log('  - 是否在 Vault 内:', normalizedSourcePath.startsWith(normalizedVaultPath + '/'))

        if (normalizedSourcePath.startsWith(normalizedVaultPath + '/')) {
            // 图片已在 vault 内，计算相对于当前笔记目录的相对路径
            const imageRelativeToVault = relative(vaultPath, sourcePath)
            const noteDir = relativeDirPath ? join(vaultPath, relativeDirPath) : vaultPath
            const imageRelativeToNote = relative(noteDir, sourcePath)

            console.log('  - 图片在 Vault 内，使用相对路径:', imageRelativeToNote)
            // 返回相对路径（用于 Markdown）
            // 如果是子目录中的图片，路径可能包含 ../
            return imageRelativeToNote.replace(/\\/g, '/')
        }

        console.log('  - 图片在 Vault 外，复制到 .images 目录')
        // 图片在 vault 外，需要复制到 .images 目录
        // 确保图片目录存在
        const imageDir = join(vaultPath, relativeDirPath, '.images')
        console.log('  - 目标目录:', imageDir)

        if (!existsSync(imageDir)) {
            console.log('  - 创建目录:', imageDir)
            mkdirSync(imageDir, { recursive: true })
        }

        // 计算源文件的内容 hash（用于去重）
        const sourceBuffer = await fs.readFile(sourcePath)
        const sourceHash = createHash('md5').update(sourceBuffer).digest('hex').substring(0, 8)
        console.log('  - 源文件 hash:', sourceHash)

        // 检查 .images 目录中是否已存在相同 hash 的图片
        try {
            const existingImages = await fs.readdir(imageDir)
            for (const img of existingImages) {
                const imgPath = join(imageDir, img)
                const imgBuffer = await fs.readFile(imgPath)
                const imgHash = createHash('md5').update(imgBuffer).digest('hex').substring(0, 8)
                if (sourceHash === imgHash) {
                    console.log('  - ✨ 找到相同内容图片，复用:', img)
                    return `.images/${img}`
                }
            }
        } catch (e) {
            // 目录为空或读取失败，继续复制
            console.log('  - 检查现有图片失败，继续复制:', e)
        }

        // 生成基于 hash 的文件名（避免覆盖且易于去重识别）
        const ext = extname(sourceFileName)
        const baseName = basename(sourceFileName, ext)
        const newFileName = `${baseName}_${sourceHash}${ext}`
        const destPath = join(imageDir, newFileName)

        // 检查目标文件是否已存在（防止重复复制相同名称的文件）
        if (existsSync(destPath)) {
            console.log('  - ✨ 目标文件已存在，直接复用:', newFileName)
            return `.images/${newFileName}`
        }

        console.log('  - 目标文件路径:', destPath)

        // 复制文件
        try {
            await fs.copyFile(sourcePath, destPath)
            console.log('  - ✅ 复制成功!')
        } catch (copyError) {
            console.error('  - ❌ 复制失败:', copyError)
            throw copyError
        }

        // 返回相对路径（用于 Markdown）
        const imagePath = `.images/${newFileName}`
        console.log('  - 返回路径:', imagePath)
        return imagePath
    })

    // 下载网络图片并保存到本地 (用于粘贴网络图片 URL)
    ipcMain.handle('fs:downloadAndSaveImage', async (_event, imageUrl: string, relativeDirPath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) throw new Error('未设置 Vault 路径')

        console.log('📥 下载网络图片:', imageUrl)
        console.log('  - 目标目录:', relativeDirPath)

        try {
            // 使用 Electron 的 net 模块下载图片
            const response = await net.fetch(imageUrl)
            if (!response.ok) {
                throw new Error(`下载失败: HTTP ${response.status}`)
            }

            // 获取图片 Buffer
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // 从 URL 推断扩展名，或从 Content-Type 推断
            let ext = 'jpg' // 默认
            const contentType = response.headers.get('content-type')
            if (contentType) {
                if (contentType.includes('png')) ext = 'png'
                else if (contentType.includes('gif')) ext = 'gif'
                else if (contentType.includes('webp')) ext = 'webp'
                else if (contentType.includes('svg')) ext = 'svg'
            } else {
                // 尝试从 URL 路径推断
                const urlPath = new URL(imageUrl).pathname
                const urlExt = extname(urlPath).toLowerCase().replace('.', '')
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(urlExt)) {
                    ext = urlExt === 'jpeg' ? 'jpg' : urlExt
                }
            }

            // 确保图片目录存在
            const imageDir = join(vaultPath, relativeDirPath, '.images')
            if (!existsSync(imageDir)) {
                mkdirSync(imageDir, { recursive: true })
            }

            // 计算 hash 用于去重
            const imageHash = createHash('md5').update(buffer).digest('hex').substring(0, 8)
            console.log('  - 图片 hash:', imageHash)

            // 检查是否已存在相同 hash 的图片
            try {
                const existingImages = await fs.readdir(imageDir)
                for (const img of existingImages) {
                    const imgPath = join(imageDir, img)
                    const imgBuffer = await fs.readFile(imgPath)
                    const imgHash = createHash('md5').update(imgBuffer).digest('hex').substring(0, 8)
                    if (imageHash === imgHash) {
                        console.log('  - ✨ 找到相同内容图片，复用:', img)
                        return `.images/${img}`
                    }
                }
            } catch (e) {
                // 目录为空或读取失败，继续保存
                console.log('  - 检查现有图片失败，继续保存:', e)
            }

            // 生成基于 hash 的文件名
            const timestamp = Date.now()
            const newFileName = `web_${timestamp}_${imageHash}.${ext}`
            const destPath = join(imageDir, newFileName)

            // 写入文件
            await fs.writeFile(destPath, buffer)
            console.log('  - ✅ 保存成功:', newFileName)

            return `.images/${newFileName}`
        } catch (error) {
            console.error('  - ❌ 下载失败:', error)
            throw error
        }
    })

    // ============ 图片引用检查与清理 ============

    // 检查图片是否被其他文件引用
    ipcMain.handle('fs:isImageReferenced', async (_event, imageRelativePath: string, excludeFilePath?: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return false

        // 从 .images/xxx.jpg 提取图片文件名
        const imageName = basename(imageRelativePath)

        // 获取图片所在目录的父目录（即笔记所在目录）
        // imageRelativePath 格式如: "Diary/.images/photo.jpg" 或 ".images/photo.jpg"
        const imageDir = dirname(imageRelativePath)  // "Diary/.images" 或 ".images"
        const searchDir = dirname(imageDir)          // "Diary" 或 "."
        const searchPath = searchDir === '.' ? vaultPath : join(vaultPath, searchDir)

        console.log(`🔍 检查图片引用: ${imageName}`)
        console.log(`  - 搜索目录: ${searchPath}`)

        try {
            const files = await fs.readdir(searchPath)
            for (const file of files) {
                // 跳过排除的文件（正在保存的文件）
                if (excludeFilePath && file === basename(excludeFilePath)) {
                    console.log(`  - 跳过排除文件: ${file}`)
                    continue
                }

                // 只检查可编辑的文本文件 (PDF/DOCX 不参与图片引用检查)
                if (!file.endsWith('.md') && !file.endsWith('.txt')) continue

                const filePath = join(searchPath, file)
                const stat = await fs.stat(filePath)
                if (stat.isDirectory()) continue

                const content = await fs.readFile(filePath, 'utf-8')
                if (content.includes(imageName)) {
                    console.log(`  - ✓ 图片被引用: ${file}`)
                    return true
                }
            }
        } catch (e) {
            console.error('检查图片引用失败:', e)
        }

        console.log(`  - ✗ 图片未被引用`)
        return false
    })

    // 删除未引用的图片
    ipcMain.handle('fs:deleteUnreferencedImage', async (_event, imageRelativePath: string) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return false

        const imagePath = join(vaultPath, imageRelativePath)

        if (existsSync(imagePath)) {
            try {
                await fs.unlink(imagePath)
                console.log('🗑️ 删除未引用图片:', imageRelativePath)
                return true
            } catch (e) {
                console.error('删除图片失败:', e)
                return false
            }
        }

        return false
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

    // ============ PDF 导出功能 ============

    /**
     * 导出 Markdown 为 PDF
     * - 接收: HTML 内容、目标 PDF 路径、文件标题
     * - 使用隐藏 BrowserWindow + printToPDF
     * - 返回: 成功/失败
     */
    ipcMain.handle('export-markdown-to-pdf', async (_event, args: {
        htmlContent: string,
        outputPath: string,
        title: string
    }): Promise<{ success: boolean, error?: string }> => {
        const { htmlContent, outputPath, title } = args

        // 创建隐藏窗口用于渲染
        const printWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false, // 隐藏窗口
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        })

        try {
            // 构建完整 HTML 文档（包含样式）
            const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        /* PDF 导出样式 */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 60px;
        }
        h1, h2, h3, h4, h5, h6 { 
            margin-top: 24px; 
            margin-bottom: 16px; 
            font-weight: 600;
            line-height: 1.25;
        }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #6a737d; }
        code { 
            background: #f6f8fa; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'SF Mono', Monaco, 'Consolas', 'Liberation Mono', 'Courier New', monospace;
            font-size: 85%;
        }
        pre { 
            background: #f6f8fa; 
            padding: 16px; 
            border-radius: 6px; 
            overflow-x: auto;
            line-height: 1.45;
        }
        pre code { 
            background: none; 
            padding: 0; 
        }
        blockquote { 
            border-left: 4px solid #dfe2e5; 
            padding: 0 16px; 
            color: #6a737d; 
            margin: 16px 0;
        }
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 16px 0;
            display: table;
        }
        th, td { 
            border: 1px solid #dfe2e5; 
            padding: 8px 13px; 
            text-align: left;
        }
        th { 
            background: #f6f8fa; 
            font-weight: 600;
        }
        img { 
            max-width: 100%; 
            height: auto; 
            display: block;
            margin: 16px 0;
        }
        a { 
            color: #0366d6; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
        ul, ol { 
            padding-left: 2em; 
            margin: 16px 0;
        }
        li { 
            margin: 4px 0; 
        }
        hr { 
            border: 0; 
            border-top: 2px solid #eaecef; 
            margin: 24px 0; 
        }
        p { 
            margin: 16px 0; 
        }
        /* 任务列表样式 */
        input[type="checkbox"] {
            margin-right: 6px;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`

            // 加载 HTML 内容
            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`)

            // 等待页面渲染完成
            await new Promise(resolve => setTimeout(resolve, 500))

            // 生成 PDF
            const pdfData = await printWindow.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                margins: {
                    top: 0.5,      // 英寸
                    bottom: 0.5,
                    left: 0.5,
                    right: 0.5
                }
            })

            // 获取完整输出路径
            const vaultPath = store.get('vaultPath')
            if (!vaultPath) throw new Error('未设置 Vault 路径')
            
            const fullOutputPath = join(vaultPath, outputPath)

            // 确保父目录存在
            const parentDir = dirname(fullOutputPath)
            if (!existsSync(parentDir)) {
                mkdirSync(parentDir, { recursive: true })
            }

            // 写入 PDF 文件
            await fs.writeFile(fullOutputPath, pdfData)

            console.log('✅ PDF 导出成功:', fullOutputPath)
            return { success: true }

        } catch (error) {
            console.error('❌ PDF 导出失败:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : '导出失败'
            }
        } finally {
            // 关闭隐藏窗口
            printWindow.close()
        }
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

    // ============ Vault 设置同步 IPC 处理器 ============

    // 同步设置到 Vault（保存应用设置的副本到用户文件夹）
    ipcMain.handle('vault:syncSettings', async () => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return false

        try {
            ensureZenNoteDir(vaultPath)
            // 从 settingsStore 获取需要同步的设置（排除敏感信息如 API Key）
            const { customSystemPrompt, promptTemplates, theme, fontFamily, fontSize, defaultFormat, smartFormatConversion } = settingsStore.store
            const settingsToSync = {
                theme,
                fontFamily,
                fontSize,
                defaultFormat,
                smartFormatConversion,
                customSystemPrompt,
                promptTemplates,
            }
            const settingsPath = join(vaultPath, '.zennote', 'settings', 'app_settings.json')
            await fs.writeFile(settingsPath, JSON.stringify(settingsToSync, null, 2), 'utf-8')
            console.log('📝 设置已同步到 Vault')
            return true
        } catch (error) {
            console.error('同步设置失败:', error)
            return false
        }
    })

    // 从 Vault 恢复设置
    ipcMain.handle('vault:loadSettings', async () => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return null

        try {
            const settingsPath = join(vaultPath, '.zennote', 'settings', 'app_settings.json')
            const content = await fs.readFile(settingsPath, 'utf-8')
            const loadedSettings = JSON.parse(content)
            console.log('📖 从 Vault 加载设置')
            return loadedSettings
        } catch {
            // 文件不存在，返回 null
            return null
        }
    })

    // 保存引擎配置到 Vault
    ipcMain.handle('vault:saveEngineConfig', async (_event, config: unknown) => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return false

        try {
            ensureZenNoteDir(vaultPath)
            const configPath = join(vaultPath, '.zennote', 'engine_config.json')
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
            console.log('⚙️ 引擎配置已保存到 Vault')
            return true
        } catch (error) {
            console.error('保存引擎配置失败:', error)
            return false
        }
    })

    // 从 Vault 加载引擎配置
    ipcMain.handle('vault:loadEngineConfig', async () => {
        const vaultPath = store.get('vaultPath')
        if (!vaultPath) return null

        try {
            const configPath = join(vaultPath, '.zennote', 'engine_config.json')
            const content = await fs.readFile(configPath, 'utf-8')
            const config = JSON.parse(content)
            console.log('⚙️ 从 Vault 加载引擎配置')
            return config
        } catch {
            // 文件不存在，返回 null
            return null
        }
    })

    // ============ 快捷方式 IPC 处理器 ============

    // 触发新建文章
    ipcMain.handle('shortcuts:createArticle', () => {
        mainWindow?.webContents.send('shortcuts:createArticle')
        return true
    })

    // 触发新建文件夹
    ipcMain.handle('shortcuts:createFolder', () => {
        mainWindow?.webContents.send('shortcuts:createFolder')
        return true
    })

    // 触发打开设置
    ipcMain.handle('shortcuts:openSettings', () => {
        mainWindow?.webContents.send('shortcuts:openSettings')
        return true
    })

    // 触发专注模式切换
    ipcMain.handle('shortcuts:toggleFocusMode', () => {
        mainWindow?.webContents.send('shortcuts:toggleFocusMode')
        return true
    })

    // ============ 菜单语言切换 IPC 处理器 ============

    // 切换菜单语言
    ipcMain.handle('menu:changeLanguage', (_event, lang: string) => {
        loadMenuLanguage(lang)
        createApplicationMenu()
        createDockMenu()
        return true
    })

    // 同步智能续写状态（渲染进程通知主进程状态变化）
    ipcMain.handle('menu:syncSmartAutocomplete', (_event, enabled: boolean) => {
        smartAutocompleteEnabled = enabled
        createApplicationMenu()  // 重建菜单以更新显示
        return true
    })

    // ============ Ollama 模型管理 IPC 处理器 ============
    // MAS 沙盒环境中禁止使用 spawn 调用外部命令

    if (isMAS) {
        // MAS 版本：返回友好的不可用提示
        const masUnavailableError = {
            success: false,
            error: 'Ollama 命令行功能在 App Store 版本中不可用。请使用 WebLLM 或通过 HTTP API 连接外部 Ollama 服务。',
            models: []
        }

        ipcMain.handle('ollama:listModels', async () => masUnavailableError)
        ipcMain.handle('ollama:pullModel', async () => masUnavailableError)
        ipcMain.handle('ollama:cancelPull', async () => masUnavailableError)
        ipcMain.handle('ollama:deleteModel', async () => masUnavailableError)

        console.log('🛡️ MAS 沙盒模式: Ollama 命令行功能已禁用')
    } else {
        // 非 MAS 版本：使用系统安装的 ollama 命令
        const ollamaEnv = {
            ...process.env,
            OLLAMA_HOST: '127.0.0.1:11434'
        }

        // 获取已安装模型列表
        ipcMain.handle('ollama:listModels', async () => {
            try {
                return new Promise((resolve) => {
                    const cmd = spawn('ollama', ['list'], { env: ollamaEnv })
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
                const pullProcess = spawn('ollama', ['pull', modelName], { env: ollamaEnv })

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
                    spawn('ollama', ['rm', modelName], { env: ollamaEnv })
                    console.log(`🗑️ 已清理未完成的模型: ${modelName}`)
                } catch (e) {
                    console.log('清理未完成模型失败:', e)
                }

                return { success: true, cancelled: modelName }
            }

            // 如果没有指定模型名，取消所有下载（向后兼容）
            if (pullProcesses.size > 0) {
                const cancelledModels: string[] = []

                Array.from(pullProcesses.entries()).forEach(([name, proc]) => {
                    console.log(`🛑 取消下载: ${name}`)
                    proc.kill('SIGTERM')
                    cancelledModels.push(name)

                    // 删除未完成的模型文件
                    try {
                        spawn('ollama', ['rm', name], { env: ollamaEnv })
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
                const deleteProcess = spawn('ollama', ['rm', modelName], { env: ollamaEnv })
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
}

// ============ 菜单创建 ============

/**
 * 创建应用菜单（macOS 风格）
 */
function createApplicationMenu() {
    const isMac = process.platform === 'darwin'

    const template: Electron.MenuItemConstructorOptions[] = [
        // macOS 应用菜单
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' as const, label: tm('menu.about', { appName: app.name }) },
                { type: 'separator' as const },
                {
                    label: tm('menu.preferences'),
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:openSettings')
                    }
                },
                { type: 'separator' as const },
                { role: 'services' as const, label: tm('menu.services') },
                { type: 'separator' as const },
                { role: 'hide' as const, label: tm('menu.hide', { appName: app.name }) },
                { role: 'hideOthers' as const, label: tm('menu.hideOthers') },
                { role: 'unhide' as const, label: tm('menu.unhide') },
                { type: 'separator' as const },
                { role: 'quit' as const, label: tm('menu.quit', { appName: app.name }) }
            ]
        }] : []),
        // 文件菜单
        {
            label: tm('menu.file'),
            submenu: [
                {
                    label: tm('menu.newArticle'),
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:createArticle')
                    }
                },
                {
                    label: tm('menu.newFolder'),
                    accelerator: 'CmdOrCtrl+Shift+N',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:createFolder')
                    }
                },
                { type: 'separator' as const },
                isMac ? { role: 'close' as const, label: tm('menu.closeWindow') } : { role: 'quit' as const, label: tm('menu.quit', { appName: app.name }) }
            ]
        },
        // 编辑菜单
        {
            label: tm('menu.edit'),
            submenu: [
                { role: 'undo' as const, label: tm('menu.undo') },
                { role: 'redo' as const, label: tm('menu.redo') },
                { type: 'separator' as const },
                { role: 'cut' as const, label: tm('menu.cut') },
                { role: 'copy' as const, label: tm('menu.copy') },
                { role: 'paste' as const, label: tm('menu.paste') },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' as const, label: tm('menu.pasteAndMatchStyle') },
                    { role: 'delete' as const, label: tm('menu.delete') },
                    { role: 'selectAll' as const, label: tm('menu.selectAll') }
                ] : [
                    { role: 'delete' as const, label: tm('menu.delete') },
                    { type: 'separator' as const },
                    { role: 'selectAll' as const, label: tm('menu.selectAll') }
                ])
            ]
        },
        // 视图菜单
        {
            label: tm('menu.view'),
            submenu: [
                {
                    label: tm('menu.focusMode'),
                    accelerator: 'CmdOrCtrl+Shift+F',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:toggleFocusMode')
                    }
                },
                {
                    label: tm('menu.cycleEditorMode'),
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:cycleEditorMode')
                    }
                },
                {
                    label: smartAutocompleteEnabled
                        ? tm('menu.disableSmartAutocomplete')
                        : tm('menu.enableSmartAutocomplete'),
                    accelerator: 'CmdOrCtrl+Shift+A',
                    click: () => {
                        mainWindow?.webContents.send('shortcuts:toggleSmartAutocomplete')
                    }
                },
                { type: 'separator' as const },
                { role: 'reload' as const, label: tm('menu.reload') },
                { role: 'forceReload' as const, label: tm('menu.forceReload') },
                { role: 'toggleDevTools' as const, label: tm('menu.devTools') },
                { type: 'separator' as const },
                { role: 'resetZoom' as const, label: tm('menu.actualSize') },
                { role: 'zoomIn' as const, label: tm('menu.zoomIn') },
                { role: 'zoomOut' as const, label: tm('menu.zoomOut') },
                { type: 'separator' as const },
                { role: 'togglefullscreen' as const, label: tm('menu.fullscreen') }
            ]
        },
        // 窗口菜单
        {
            label: tm('menu.window'),
            submenu: [
                {
                    label: tm('menu.showMainWindow'),
                    accelerator: 'CmdOrCtrl+1',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.show()
                            mainWindow.focus()
                        } else {
                            createWindow()
                        }
                    }
                },
                { type: 'separator' as const },
                { role: 'minimize' as const, label: tm('menu.minimize') },
                { role: 'zoom' as const, label: tm('menu.zoom') },
                ...(isMac ? [
                    { type: 'separator' as const },
                    { role: 'front' as const, label: tm('menu.front') }
                ] : [
                    { role: 'close' as const, label: tm('menu.close') }
                ])
            ]
        },
        // 帮助菜单
        {
            role: 'help' as const,
            label: tm('menu.help'),
            submenu: [
                {
                    label: tm('menu.visitGitHub'),
                    click: async () => {
                        await shell.openExternal('https://github.com/hooosberg/WitNote')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

/**
 * 创建 Dock 菜单（仅 macOS）
 */
function createDockMenu() {
    if (process.platform !== 'darwin') return

    const dockMenu = Menu.buildFromTemplate([
        {
            label: tm('menu.showMainWindow'),
            click: () => {
                if (mainWindow) {
                    mainWindow.show()
                    mainWindow.focus()
                } else {
                    createWindow()
                }
            }
        },
        { type: 'separator' },
        {
            label: tm('menu.newArticle'),
            click: () => {
                mainWindow?.webContents.send('shortcuts:createArticle')
            }
        },
        {
            label: tm('menu.newFolder'),
            click: () => {
                mainWindow?.webContents.send('shortcuts:createFolder')
            }
        },
        { type: 'separator' },
        {
            label: tm('menu.openSettings'),
            click: () => {
                mainWindow?.webContents.send('shortcuts:openSettings')
            }
        },
        {
            label: tm('menu.toggleFocusMode'),
            click: () => {
                mainWindow?.webContents.send('shortcuts:toggleFocusMode')
            }
        }
    ])

    app.dock.setMenu(dockMenu)
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
        },
        title: "WitNote"
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
    // 注册自定义协议 local-file:// 用于加载本地图片
    protocol.handle('local-file', (request) => {
        // 将 local-file:// URL 转换为 file:// URL
        const url = request.url.replace('local-file://', 'file://')
        console.log('🖼️ 加载本地图片:', url)
        return net.fetch(url)
    })
    console.log('✅ 注册 local-file:// 协议')

    // 检测系统语言并加载菜单翻译
    const systemLang = detectSystemLanguage()
    loadMenuLanguage(systemLang)
    console.log(`🌍 系统语言: ${app.getLocale()} → 菜单语言: ${systemLang}`)

    setupIpcHandlers()
    createApplicationMenu()  // 创建应用菜单
    createDockMenu()         // 创建 Dock 菜单 (仅 macOS)
    createWindow()

    app.on('activate', () => {
        // macOS: 点击 Dock 图标时重新显示或创建窗口
        if (mainWindow) {
            // 窗口存在但可能被隐藏或最小化
            mainWindow.show()
            mainWindow.focus()
        } else if (BrowserWindow.getAllWindows().length === 0) {
            // 没有任何窗口，创建新窗口
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

// 应用退出时清理 security-scoped 资源
app.on('will-quit', () => {
    if (stopAccessingResource) {
        stopAccessingResource()
        stopAccessingResource = null
        console.log('🔒 应用退出，释放文件夹访问权限')
    }
})

console.log('🧘 智简笔记本启动中...')
console.log('📊 VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL || '未设置 (生产模式)')
