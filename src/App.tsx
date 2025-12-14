/**
 * 主应用组件
 * Phase 7：清理空状态、正方形卡片、颜色系统
 */

import React, { useEffect, useState } from 'react'
import { FolderPlus, Plus } from 'lucide-react'
import Onboarding from './components/Onboarding'
import FileTree, { ColorKey } from './components/FileTree'
import Editor from './components/Editor'
import ChatPanel from './components/ChatPanel'
import InputDialog from './components/InputDialog'
import { ToastProvider, useToast } from './components/Toast'
import { useFileSystem, FileNode } from './hooks/useFileSystem'
import { useLLM } from './hooks/useLLM'
import './styles/index.css'

// 生成文件名 - 默认 .txt
const generateFileName = (): string => {
    const now = new Date()
    const timestamp = `${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}`
    return `Untitled_${timestamp}.txt`
}

const AppContent: React.FC = () => {
    const fileSystem = useFileSystem()
    const llm = useLLM()
    const { showToast } = useToast()

    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [renameTarget, setRenameTarget] = useState<FileNode | null>(null)
    const [colors, setColors] = useState<Record<string, ColorKey>>({})

    const {
        vaultPath,
        isInitialized,
        fileTree,
        activeFile,
        activeFolder,
        fileContent,
        selectVault,
        openFile,
        setFileContent,
        toggleFileFormat,
        createNewFile,
        createNewFolder,
        renameItem,
        deleteFile,
    } = fileSystem

    // 引擎切换
    useEffect(() => {
        llm.onEngineChange((event) => {
            if (event.reason === 'heartbeat') {
                showToast(
                    event.to === 'ollama' ? 'success' : 'info',
                    event.to === 'ollama' ? '🟢 Ollama 已连接' : '🔵 使用内置模型'
                )
            }
        })
    }, [llm, showToast])

    // 上下文同步
    useEffect(() => {
        if (activeFile) {
            llm.loadChatHistory(activeFile.path)
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        } else if (activeFolder) {
            const files = activeFolder.children?.filter(c => !c.isDirectory).map(c => c.name) || []
            llm.setActiveFolderContext(activeFolder.name, files)
        } else {
            llm.setActiveFileContext(null, null, null)
        }
    }, [activeFile?.path, activeFolder?.path])

    useEffect(() => {
        if (activeFile) {
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        }
    }, [fileContent])

    // 颜色系统
    const getColor = (path: string): ColorKey => colors[path] || 'none'
    const setColor = (path: string, color: ColorKey) => {
        setColors(prev => {
            const next = { ...prev }
            if (color === 'none') delete next[path]
            else next[path] = color
            return next
        })
    }

    // 加载中
    if (!isInitialized) {
        return (
            <div className="app-loading">
                <div className="loading-spinner">🧘</div>
                <p>正在初始化...</p>
            </div>
        )
    }

    if (!vaultPath) {
        return <Onboarding onSelectVault={selectVault} />
    }

    // Handlers
    const handleCreateFolder = async (name: string) => {
        await createNewFolder(name)
        setShowNewFolderDialog(false)
    }

    const handleQuickCreate = async () => {
        const fileName = generateFileName()
        await createNewFile(fileName)
    }

    const handleRename = async (newName: string) => {
        if (renameTarget) {
            await renameItem(renameTarget.path, newName)
            setShowRenameDialog(false)
            setRenameTarget(null)
        }
    }

    const handleDelete = async (node: FileNode) => {
        if (confirm(`删除 "${node.name}"?`)) {
            await deleteFile(node.path)
        }
    }

    const handleTitleChange = async (newFileName: string) => {
        if (activeFile && newFileName !== activeFile.name) {
            await renameItem(activeFile.path, newFileName)
        }
    }

    const getCurrentFolderFiles = (): FileNode[] => {
        if (activeFolder) {
            return activeFolder.children?.filter(c => !c.isDirectory) || []
        }
        return fileTree.filter(n => !n.isDirectory)
    }

    // 颜色边框样式
    const getCardStyle = (path: string) => {
        const color = getColor(path)
        const colorMap: Record<string, { border: string; bg: string }> = {
            red: { border: '#ff453a', bg: 'rgba(255,69,58,0.05)' },
            orange: { border: '#ff9500', bg: 'rgba(255,149,0,0.05)' },
            yellow: { border: '#ffcc00', bg: 'rgba(255,204,0,0.05)' },
            green: { border: '#30d158', bg: 'rgba(48,209,88,0.05)' },
            blue: { border: '#007aff', bg: 'rgba(0,122,255,0.05)' },
            purple: { border: '#bf5af2', bg: 'rgba(191,90,242,0.05)' },
            gray: { border: '#8e8e93', bg: 'rgba(142,142,147,0.05)' },
        }
        return colorMap[color] || { border: 'rgba(0,0,0,0.08)', bg: 'transparent' }
    }

    const files = getCurrentFolderFiles()

    return (
        <div className="app-container">
            <div className="titlebar-drag-region" />

            {/* 对话框 */}
            <InputDialog
                isOpen={showNewFolderDialog}
                title="新建文件夹"
                placeholder="名称"
                onConfirm={handleCreateFolder}
                onCancel={() => setShowNewFolderDialog(false)}
            />
            <InputDialog
                isOpen={showRenameDialog}
                title="重命名"
                placeholder="新名称"
                defaultValue={renameTarget?.name || ''}
                onConfirm={handleRename}
                onCancel={() => { setShowRenameDialog(false); setRenameTarget(null) }}
            />

            {/* 左侧边栏 */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">文件</span>
                    <button
                        className="sidebar-btn"
                        onClick={() => setShowNewFolderDialog(true)}
                    >
                        <FolderPlus size={16} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="sidebar-content">
                    {fileTree.length === 0 ? (
                        <div className="sidebar-empty">空</div>
                    ) : (
                        <FileTree
                            nodes={fileTree}
                            activeFilePath={activeFile?.path || activeFolder?.path || null}
                            onFileSelect={openFile}
                            onRename={(node) => {
                                setRenameTarget(node)
                                setShowRenameDialog(true)
                            }}
                            onDelete={handleDelete}
                            getColor={getColor}
                            onColorChange={setColor}
                        />
                    )}
                </div>
            </div>

            {/* 中间内容区 */}
            <div className="main-content">
                {activeFile ? (
                    <Editor
                        content={fileContent}
                        onChange={setFileContent}
                        fileName={activeFile.name}
                        fileExtension={activeFile.extension || 'txt'}
                        onTitleChange={handleTitleChange}
                        onFormatToggle={toggleFileFormat}
                        onNewFile={handleQuickCreate}
                    />
                ) : (
                    /* 正方形卡片网格 - 清理空状态 */
                    <div className="gallery-view">
                        {files.length === 0 ? (
                            <div className="gallery-empty-clean">
                                <button className="empty-create-btn" onClick={handleQuickCreate}>
                                    <Plus size={24} strokeWidth={1.2} />
                                </button>
                            </div>
                        ) : (
                            <div className="gallery-grid-square">
                                {files.map(file => {
                                    const style = getCardStyle(file.path)
                                    return (
                                        <div
                                            key={file.path}
                                            className="file-card-square"
                                            onClick={() => openFile(file)}
                                            style={{
                                                borderColor: style.border,
                                                background: style.bg
                                            }}
                                        >
                                            <div className="card-title">
                                                {file.name.replace(/\.[^/.]+$/, '')}
                                            </div>
                                            <div className="card-summary">
                                                点击查看内容...
                                            </div>
                                            <div className="card-date">
                                                {file.extension === 'md' ? 'Markdown' : 'Text'}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 右侧 AI 面板 */}
            <ChatPanel llm={llm} />
        </div>
    )
}

export const App: React.FC = () => (
    <ToastProvider>
        <AppContent />
    </ToastProvider>
)

export default App
