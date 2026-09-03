'use client';

import { useEffect, useRef } from 'react';
import LegalDocumentViewer from './LegalDocumentViewer';
import type { LegalDocId } from '@/lib/legal';

interface LegalModalProps {
    open: boolean;
    activeDoc: LegalDocId;
    onDocChange: (doc: LegalDocId) => void;
    onClose: () => void;
}

/** Read-only reader for the legal documents, opened from the About modal. */
export default function LegalModal({ open, activeDoc, onDocChange, onClose }: LegalModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog ref={dialogRef} className='modal' onClose={onClose}>
            <div className='modal-box flex max-w-3xl flex-col h-[80vh]'>
                <form method='dialog'>
                    <button className='btn btn-sm btn-circle btn-ghost absolute right-2 top-2'>✕</button>
                </form>

                <h3 className='shrink-0 pr-8 text-lg font-bold'>Legal</h3>

                {/* Mounted only while open so the documents are fetched on demand. */}
                {open && (
                    <div className='mt-2 flex min-h-0 flex-1 flex-col'>
                        <LegalDocumentViewer activeDoc={activeDoc} onDocChange={onDocChange} />
                    </div>
                )}
            </div>
        </dialog>
    );
}
