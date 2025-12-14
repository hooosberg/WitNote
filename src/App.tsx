/**
 * 主应用组件
 * Phase 4: 交互优化 - 自动创建 Untitled、移除侧边栏新建文件
 */

import React, { useEffect, useState } from 'react'
import { FolderPlus, FilePlus } from 'lucide-react'
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
    return `未命名_${timestamp}.md`
}

const AppContent: React.FC = () => {
    const fileSystem = useFileSystem()
    const llm = useLLM()
    const { showToast } = useToast()

    // 对话框状态
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
        selectFolder,
        setFileContent,
        toggleFileFormat,
        createNewFile,
        createNewFolder,
        renameItem,
        deleteFile,
    } = fileSystem

    // 监听引擎切换
    useEffect(() => {
        llm.onEngineChange((event) => {
            if (event.reason === 'heartbeat') {
                if (event.to === 'ollama') {
                    showToast('success', '🟢 已切换到本地模型')
                } else {
                    showToast('warning', '🔵 已切换到内置模型')
                }
            }
        })
    }, [llm, showToast])

    // 文件/文件夹切换时更新上下文
    useEffect(() => {
        if (activeFile) {
            llm.loadChatHistory(activeFile.path)
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent)
        } else if (activeFolder) {
            const files = activeFolder.children?.filter(c => !c.isDirectory).map(c => c.name) || []
            llm.setActiveFolderContext(activeFolder.name, files)
        } else {
            llm.setActiveFileContext(null, null, null)
            llm.clearMessages()
        }
    }, [activeFile?.path, activeFolder?.path])

    // 文件内容变化
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

    // 未选择 Vault
    if (!vaultPath) {
        return <Onboarding onSelectVault={selectVault} />
    }

    // 创建文件夹
    const handleCreateFolder = async (name: string) => {
        await createNewFolder(name)
        setShowNewFolderDialog(false)
        showToast('success', `📁 已创建: ${name}`)
    }

    // 快速创建文件（无 Modal）
    const handleQuickCreateFile = async () => {
        const fileName = generateUntitledName()
        await createNewFile(fileName)
        showToast('success', '📝 新日记已创建')
    }

    // 重命名
    const handleRename = async (newName: string) => {
        if (renameTarget) {
            await renameItem(renameTarget.path, newName)
            setShowRenameDialog(false)
            setRenameTarget(null)
        }
    }

    // 删除
    const handleDelete = async (node: FileNode) => {
        if (confirm(`确定删除 "${node.name}"?`)) {
            await deleteFile(node.path)
            showToast('info', '🗑️ 已删除')
        }
    }

    // 编辑器内改标题
    const handleTitleChange = async (newFileName: string) => {
        if (activeFile && newFileName !== activeFile.name) {
            await renameItem(activeFile.path, newFileName)
        }
    }

    // 当前文件夹的文件
    const getCurrentFolderFiles = (): FileNode[] => {
        if (activeFolder) {
            return activeFolder.children?.filter(c => !c.isDirectory) || []
        }
        return fileTree.filter(n => !n.isDirectory)
    }

    return (
        <div className="app-container" data-theme="light">
            <div className="titlebar-drag-region" />

            {/* 对话框 */}
            <InputDialog
                isOpen={showNewFolderDialog}
                title="新建文件夹"
                placeholder="文件夹名称"
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

            {/* 左侧边栏 - 只保留新建文件夹 */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">文件</span>
                    <button
                        className="sidebar-btn"
                        onClick={() => setShowNewFolderDialog(true)}
                        title="新建文件夹"
                    >
                        <FolderPlus size={16} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="sidebar-content">
                    {fileTree.length === 0 ? (
                        <div className="sidebar-empty">
                            <p>文件夹为空</p>
                        </div>
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
                ) : activeFolder ? (
                    <div className="folder-view">
                        <div className="folder-header">
                            <h2 className="folder-title">📁 {activeFolder.name}</h2>
                            <button
                                className="new-note-btn"
                                onClick={handleQuickCreateFile}
                            >
                                <FilePlus size={16} strokeWidth={1.5} />
                                新建日记
                            </button>
                        </div>
                        <div className="folder-content">
                            {getCurrentFolderFiles().length === 0 ? (
                                <div className="folder-empty">
                                    <div className="empty-icon">📝</div>
                                    <h3>空文件夹</h3>
                                    <p>点击上方按钮创建日记</p>
                                </div>
                            ) : (
                                <div className="file-grid">
                                    {getCurrentFolderFiles().map(file => (
                                        <div
                                            key={file.path}
                                            className="file-card"
                                            onClick={() => openFile(file)}
                                        >
                                            <div className="file-card-icon">
                                                {file.extension === 'md' ? '📄' : '📃'}
                                            </div>
                                            <div className="file-card-name">{file.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="editor-empty">
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <div className="empty-state-title">选择文件开始</div>
                            <div className="empty-state-desc">
                                从左侧选择文件或文件夹
                            </div>
                            <button
                                className="new-note-btn"
                                style={{ marginTop: '20px' }}
                                onClick={handleQuickCreateFile}
                            >
                                <FilePlus size={16} strokeWidth={1.5} />
                                新建日记
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 右侧 AI 面板 */}
            <ChatPanel llm={llm} />
        </div>
    )
}

export const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    )
}

export default App
