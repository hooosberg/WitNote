/**
 * 侧边栏组件
 * 显示笔记列表
 */

import React from 'react';

interface Note {
    id: string;
    title: string;
    preview: string;
    updatedAt: number;
}

interface SidebarProps {
    notes: Note[];
    activeNoteId: string | null;
    onNoteSelect: (id: string) => void;
    onNewNote: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    notes,
    activeNoteId,
    onNoteSelect,
    onNewNote
}) => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <span className="sidebar-title">笔记</span>
            </div>

            <div className="sidebar-content">
                {notes.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 16px' }}>
                        <div className="empty-state-desc">
                            暂无笔记，点击上方按钮创建
                        </div>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
                            onClick={() => onNoteSelect(note.id)}
                        >
                            <div className="note-item-title">
                                {note.title || '无标题'}
                            </div>
                            <div className="note-item-preview">
                                {note.preview || '空笔记'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Sidebar;
