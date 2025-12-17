/**
 * 首次启动引导组件
 * 当用户未选择 Vault 目录时显示
 */

import React from 'react'
import { useTranslation } from 'react-i18next'

interface OnboardingProps {
    onSelectVault: () => Promise<boolean>
}

export const Onboarding: React.FC<OnboardingProps> = ({ onSelectVault }) => {
    const { t } = useTranslation()
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
                <h1 className="onboarding-title">{t('app.name')}</h1>

                {/* 描述 */}
                <p className="onboarding-desc">
                    {t('app.tagline')}<br />
                    {t('onboarding.selectFolderPrompt')}
                </p>

                {/* 选择按钮 */}
                <button
                    className="onboarding-button"
                    onClick={handleSelect}
                    disabled={isSelecting}
                >
                    {isSelecting ? '...' : t('onboarding.selectButton')}
                </button>

                {/* 提示 */}
                <p className="onboarding-hint">
                    {t('sidebar.connectFolder')}
                </p>
            </div>
        </div>
    )
}

export default Onboarding
