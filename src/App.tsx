/**
 * 主应用组件
 * 简化版本 - 移除 react-resizable-panels
 */

import React, { useEffect, useState } from 'react'
import { FolderPlus, Plus, FileText, FileCode, Folder } from 'lucide-react'
import Onboarding from './components/Onboarding'
import FileTree from './components/FileTree'
import Editor from './components/Editor'
import ChatPanel from './components/ChatPanel'
import InputDialog from './components/InputDialog'
import { ToastProvider, useToast } from './components/Toast'
import { useFileSystem, FileNode } from './hooks/useFileSystem'
import { useLLM } from './hooks/useLLM'
import './styles/index.css'

// 生成唯一文件名
const generateUntitledName = (): string => {
    const now = new Date()
    const timestamp = `${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}`
    return `Untitled_${timestamp}.md`
}

const AppContent: React.FC = () => {
    const fileSystem = useFileSystem()
    const llm = useLLM()
    const { showToast } = useToast()

    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [renameTarget, setRenameTarget] = useState<FileNode | null>(null)

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
        const fileName = generateUntitledName()
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
                        <div className="sidebar-empty">空文件夹</div>
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
                    />
                ) : (
                    /* Gallery 视图 */
                    <div className="gallery-view">
                        <div className="gallery-header">
                            <h2 className="gallery-title">
                                {activeFolder ? `📁 ${activeFolder.name}` : '所有文件'}
                            </h2>
                            <button className="gallery-add-btn" onClick={handleQuickCreate}>
                                <Plus size={18} strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="gallery-grid">
                            {getCurrentFolderFiles().length === 0 ? (
                                <div className="gallery-empty">
                                    <p>空</p>
                                    <button onClick={handleQuickCreate}>
                                        <Plus size={20} strokeWidth={1.5} />
                                    </button>
                                </div>
                            ) : (
                                getCurrentFolderFiles().map(file => (
                                    <div
                                        key={file.path}
                                        className="file-card-simple"
                                        onClick={() => openFile(file)}
                                    >
                                        <div className="card-icon">
                                            {file.extension === 'md' ? (
                                                <FileCode size={28} strokeWidth={1.2} />
                                            ) : (
                                                <FileText size={28} strokeWidth={1.2} />
                                            )}
                                        </div>
                                        <div className="card-name">
                                            {file.name.replace(/\.[^/.]+$/, '')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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
