import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
    title: string;
    message: string;
    details?: string[];
    onConfirm: () => void;
    onCancel: () => void;
    /** 变体样式：warning 使用三角警告图标，info 使用圆形图标（默认） */
    variant?: 'info' | 'warning';
}

export default function ConfirmDialog({ title, message, details, onConfirm, onCancel, variant = 'info' }: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Logo/Icon */}
                <div className={`confirm-icon ${variant === 'warning' ? 'warning' : ''}`}>
                    {variant === 'warning' ? (
                        <AlertTriangle size={40} strokeWidth={2} />
                    ) : (
                        <AlertCircle size={40} strokeWidth={2} />
                    )}
                </div>

                {/* Title */}
                <h3 className="confirm-title">{title}</h3>

                {/* Message */}
                <p className="confirm-message">{message}</p>

                {/* Details list (optional) */}
                {details && details.length > 0 && (
                    <ul className="confirm-details">
                        {details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                        ))}
                    </ul>
                )}

                {/* Buttons */}
                <div className="confirm-buttons">
                    <button className="confirm-button cancel" onClick={onCancel}>
                        {t('dialog.cancel')}
                    </button>
                    <button className="confirm-button confirm" onClick={onConfirm}>
                        {t('dialog.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
