import { AlertCircle } from 'lucide-react';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
    title: string;
    message: string;
    details?: string[];
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({ title, message, details, onConfirm, onCancel }: ConfirmDialogProps) {
    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Logo/Icon */}
                <div className="confirm-icon">
                    <AlertCircle size={40} strokeWidth={2} />
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
                        取消
                    </button>
                    <button className="confirm-button confirm" onClick={onConfirm}>
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
}
