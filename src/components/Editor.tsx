/**
 * 编辑器组件
 * 简单的 Markdown 文本编辑器
 */

import React from 'react';

interface EditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export const Editor: React.FC<EditorProps> = ({
    content,
    onChange,
    placeholder = '开始写作...'
}) => {
    return (
        <div className="editor-container">
            <textarea
                className="editor-textarea"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
};

export default Editor;
