/**
 * 首次启动引导组件
 * 当用户未选择 Vault 目录时显示
 */

import React from 'react'

interface OnboardingProps {
    onSelectVault: () => Promise<boolean>
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelectVault }) => {
    const [isSelecting, setIsSelecting] = React.useState(false)

    const handleSelect = async () => {
        setIsSelecting(true)
        await onSelectVault()
        setIsSelecting(false)
    }

    return (
        <div className="onboarding-container">
            <div className="onboarding-content">
                {/* Logo */}
                <div className="onboarding-logo">🧘</div>

                {/* 标题 */}
                <h1 className="onboarding-title">禅意笔记本</h1>

                {/* 描述 */}
                <p className="onboarding-desc">
                    本地优先的 AI 笔记应用<br />
                    所有数据存储在您选择的文件夹中
                </p>

                {/* 选择按钮 */}
                <button
                    className="onboarding-button"
                    onClick={handleSelect}
                    disabled={isSelecting}
                >
                    {isSelecting ? '选择中...' : '选择笔记文件夹'}
                </button>

                {/* 提示 */}
                <p className="onboarding-hint">
                    支持 .txt 和 .md 格式，可随时切换
                </p>
            </div>
        </div>
    )
}

export default Onboarding
