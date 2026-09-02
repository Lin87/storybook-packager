'use client';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel }: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className='modal modal-open'>
            <div className='modal-box'>
                <h3 className='font-bold text-lg'>{title}</h3>
                <p className='py-4'>{message}</p>

                <div className='modal-action'>
                    <button className='btn btn-error' onClick={onConfirm}>
                        {confirmLabel}
                    </button>

                    <button className='btn' onClick={onCancel}>
                        {cancelLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
