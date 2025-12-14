/**
 * 主应用组件
 * 禅意笔记本 - Phase 2: 重新设计的 UI 布局
 */

import React, { useEffect, useState } from 'react';
import Onboarding from './components/Onboarding';
import FileTree from './components/FileTree';
import Editor from './components/Editor';
import ChatPanel from './components/ChatPanel';
import InputDialog from './components/InputDialog';
import { ToastProvider, useToast } from './components/Toast';
import { useFileSystem, FileNode } from './hooks/useFileSystem';
import { useLLM } from './hooks/useLLM';
import './styles/index.css';

// 主应用内容（需要在 ToastProvider 内部）
const AppContent: React.FC = () => {
    const fileSystem = useFileSystem();
    const llm = useLLM();
    const { showToast } = useToast();

    // 对话框状态
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);

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
    } = fileSystem;

    // 监听引擎切换事件
    useEffect(() => {
        llm.onEngineChange((event) => {
            if (event.reason === 'heartbeat') {
                if (event.to === 'ollama') {
                    showToast('success', '🟢 已切换到 Ollama 本地模型');
                } else {
                    showToast('warning', '🔵 Ollama 离线，已切换到内置模型');
                }
            }
        });
    }, [llm, showToast]);

    // 文件切换时加载对应的聊天记录
    useEffect(() => {
        if (activeFile) {
            llm.loadChatHistory(activeFile.path);
            llm.setActiveFileContext(
                activeFile.path,
                activeFile.name,
                fileContent
            );
        } else {
            llm.setActiveFileContext(null, null, null);
            llm.clearMessages();
        }
    }, [activeFile?.path]);

    // 文件内容变化时更新上下文
    useEffect(() => {
        if (activeFile) {
            llm.setActiveFileContext(activeFile.path, activeFile.name, fileContent);
        }
    }, [fileContent]);

    // 自测日志
    useEffect(() => {
        if (llm.status === 'ready') {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🧪 自测流程完成！');
            console.log(`📊 当前引擎: ${llm.providerType === 'ollama' ? 'Ollama (本地核心)' : 'WebLLM (内置核心)'}`);
            console.log(`📊 当前模型: ${llm.modelName}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    }, [llm.status]);

    // 未初始化时显示加载
    if (!isInitialized) {
        return (
            <div className="app-loading">
                <div className="loading-spinner">🧘</div>
                <p>正在初始化...</p>
            </div>
        );
    }

    // 未选择 Vault 时显示引导页
    if (!vaultPath) {
        return <Onboarding onSelectVault={selectVault} />;
    }

    // 处理创建新文件夹
    const handleCreateFolder = async (name: string) => {
        await createNewFolder(name);
        setShowNewFolderDialog(false);
        showToast('success', `📁 已创建文件夹: ${name}`);
    };

    // 处理创建新文件
    const handleCreateFile = async (name: string) => {
        let fileName = name;
        if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
            fileName += '.md';
        }
        await createNewFile(fileName);
        setShowNewFileDialog(false);
        showToast('success', `📄 已创建: ${fileName}`);
    };

    // 处理重命名
    const handleRename = async (newName: string) => {
        if (renameTarget) {
            await renameItem(renameTarget.path, newName);
            setShowRenameDialog(false);
            setRenameTarget(null);
            showToast('success', `✏️ 已重命名为: ${newName}`);
        }
    };

    // 开始重命名
    const startRename = (node: FileNode) => {
        setRenameTarget(node);
        setShowRenameDialog(true);
    };

    // 获取当前选中文件夹的子文件
    const getCurrentFolderFiles = (): FileNode[] => {
        if (activeFolder) {
            return activeFolder.children?.filter(c => !c.isDirectory) || [];
        }
        return fileTree.filter(n => !n.isDirectory);
    };

    return (
        <div className="app-container">
            {/* 标题栏拖拽区域 */}
            <div className="titlebar-drag-region" />

            {/* 对话框 */}
            <InputDialog
                isOpen={showNewFolderDialog}
                title="新建文件夹"
                placeholder="输入文件夹名称"
                onConfirm={handleCreateFolder}
                onCancel={() => setShowNewFolderDialog(false)}
            />
            <InputDialog
                isOpen={showNewFileDialog}
                title="新建日记"
                placeholder="输入文件名 (如: 今日随想.md)"
                onConfirm={handleCreateFile}
                onCancel={() => setShowNewFileDialog(false)}
            />
            <InputDialog
                isOpen={showRenameDialog}
                title={renameTarget?.isDirectory ? '重命名文件夹' : '重命名日记'}
                placeholder="输入新名称"
                defaultValue={renameTarget?.name || ''}
                onConfirm={handleRename}
                onCancel={() => { setShowRenameDialog(false); setRenameTarget(null); }}
            />

            {/* 左侧边栏 - 文件夹列表 */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-title">文件夹</span>
                    <button
                        className="sidebar-new-btn"
                        onClick={() => setShowNewFolderDialog(true)}
                        title="新建文件夹"
                    >
                        +
                    </button>
                </div>

                <div className="sidebar-content">
                    {/* 根目录项 */}
                    <div
                        className={`file-tree-item root-item ${!activeFolder && !activeFile ? 'active' : ''}`}
                        onClick={() => selectFolder(null)}
                    >
                        <span className="file-tree-icon">🏠</span>
                        <span className="file-tree-name">所有笔记</span>
                    </div>

                    {/* 文件夹列表 */}
                    {fileTree.filter(n => n.isDirectory).length === 0 ? (
                        <div className="sidebar-empty">
                            <p>还没有文件夹</p>
                            <p className="hint">点击 + 创建第一个</p>
                        </div>
                    ) : (
                        <FileTree
                            nodes={fileTree.filter(n => n.isDirectory)}
                            activeFilePath={activeFolder?.path || null}
                            onFileSelect={openFile}
                            onRename={startRename}
                        />
                    )}
                </div>
            </div>

            {/* 主内容区 */}
            <div className="main-content">
                {activeFile ? (
                    /* 编辑器视图 */
                    <>
                        <div className="editor-toolbar">
                            <div
                                className="editor-filename editable"
                                onClick={() => startRename(activeFile)}
                                title="点击重命名"
                            >
                                <span>{activeFile.name}</span>
                                <span className="edit-icon">✏️</span>
                            </div>
                            <button
                                className="format-toggle-btn"
                                onClick={toggleFileFormat}
                                title="切换格式"
                            >
                                {activeFile.extension === '.md' || activeFile.extension === 'md' ? 'MD' : 'TXT'}
                            </button>
                        </div>
                        <Editor
                            content={fileContent}
                            onChange={setFileContent}
                            placeholder="开始写作..."
                        />
                    </>
                ) : (
                    /* 文件夹视图 */
                    <div className="folder-view">
                        <div className="folder-header">
                            <h2 className="folder-title">
                                {activeFolder ? (
                                    <span
                                        className="editable"
                                        onClick={() => startRename(activeFolder)}
                                        title="点击重命名"
                                    >
                                        📁 {activeFolder.name}
                                        <span className="edit-icon">✏️</span>
                                    </span>
                                ) : (
                                    '📚 所有笔记'
                                )}
                            </h2>
                            <button
                                className="new-note-btn"
                                onClick={() => setShowNewFileDialog(true)}
                            >
                                <span className="btn-icon">+</span>
                                新建日记
                            </button>
                        </div>

                        <div className="folder-content">
                            {getCurrentFolderFiles().length === 0 ? (
                                <div className="folder-empty">
                                    <div className="empty-icon">📝</div>
                                    <h3>这里还是空的</h3>
                                    <p>点击上方按钮创建第一篇日记</p>
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
                                                {file.extension === 'md' || file.extension === '.md' ? '📄' : '📃'}
                                            </div>
                                            <div className="file-card-name">{file.name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 右侧 AI 聊天面板 */}
            <ChatPanel llm={llm} activeFileName={activeFile?.name || null} />
        </div>
    );
};

// 根组件（包含 ToastProvider）
export const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
};

export default App;
