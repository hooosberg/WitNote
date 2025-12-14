/**
 * 主应用组件
 * 禅意笔记本 - 双模 AI 引擎版本
 */

import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import ChatPanel from './components/ChatPanel';
import { useLLM } from './hooks/useLLM';
import './styles/index.css';

// 笔记类型
interface Note {
    id: string;
    title: string;
    content: string;
    preview: string;
    updatedAt: number;
}

// 生成 ID
function generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 从内容提取标题和预览
function extractTitleAndPreview(content: string): { title: string; preview: string } {
    const lines = content.trim().split('\n');
    const title = lines[0]?.replace(/^#\s*/, '').trim() || '';
    const preview = lines.slice(1).join(' ').trim().substring(0, 50);
    return { title, preview };
}

export const App: React.FC = () => {
    // LLM Hook
    const llm = useLLM();

    // 笔记状态
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

    // 当前笔记
    const activeNote = notes.find((n) => n.id === activeNoteId) || null;

    // 创建新笔记
    const handleNewNote = useCallback(() => {
        const newNote: Note = {
            id: generateId(),
            title: '',
            content: '',
            preview: '',
            updatedAt: Date.now()
        };
        setNotes((prev) => [newNote, ...prev]);
        setActiveNoteId(newNote.id);
    }, []);

    // 选择笔记
    const handleNoteSelect = useCallback((id: string) => {
        setActiveNoteId(id);
    }, []);

    // 更新笔记内容
    const handleContentChange = useCallback(
        (content: string) => {
            if (!activeNoteId) return;

            const { title, preview } = extractTitleAndPreview(content);

            setNotes((prev) =>
                prev.map((note) =>
                    note.id === activeNoteId
                        ? { ...note, content, title, preview, updatedAt: Date.now() }
                        : note
                )
            );
        },
        [activeNoteId]
    );

    // 自测：启动时发送测试消息
    useEffect(() => {
        if (llm.status === 'ready') {
            console.log('🧪 自测流程开始...');
            console.log(`📊 当前引擎: ${llm.providerType}`);
            console.log(`📊 当前模型: ${llm.modelName}`);

            // 自动发送测试消息
            setTimeout(() => {
                llm.sendMessage('你好，你在运行哪个模型？');
            }, 500);
        }
    }, [llm.status]); // 只在状态变化时触发一次

    // 初始化：创建一个默认笔记
    useEffect(() => {
        if (notes.length === 0) {
            handleNewNote();
        }
    }, [notes.length, handleNewNote]);

    return (
        <div className="app-container">
            {/* 标题栏拖拽区域 */}
            <div className="titlebar-drag-region" />

            {/* 左侧边栏 */}
            <Sidebar
                notes={notes}
                activeNoteId={activeNoteId}
                onNoteSelect={handleNoteSelect}
                onNewNote={handleNewNote}
            />

            {/* 主编辑区 */}
            <div className="main-content">
                <Editor
                    content={activeNote?.content || ''}
                    onChange={handleContentChange}
                    placeholder="# 开始写作...

在这里记录你的想法，AI 助手随时为你服务。"
                />
            </div>

            {/* 右侧 AI 聊天面板 */}
            <ChatPanel llm={llm} />
        </div>
    );
};

export default App;
