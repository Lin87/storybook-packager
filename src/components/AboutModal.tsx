'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpCircleFill, CheckCircleFill, ExclamationTriangleFill, InfoCircleFill } from 'react-bootstrap-icons';
import type { UpdateCheckResult } from '@/types/updates';
import LegalModal from './LegalModal';
import type { LegalDocId } from '@/lib/legal';

interface AboutModalProps {
    open: boolean;
    onClose: () => void;
}

const currentYear = new Date().getFullYear();

interface UpdateStatusProps {
    result: UpdateCheckResult | null;
    checking: boolean;
    onDownload: () => void;
    onRemindLater: (version: string) => void;
}

function UpdateStatus({ result, checking, onDownload, onRemindLater }: UpdateStatusProps) {
    if (checking) {
        return (
            <p className='flex items-center justify-center gap-2 text-sm opacity-70'>
                <span className='loading loading-spinner loading-xs' />
                Checking for updates...
            </p>
        );
    }

    if (!result) return null;

    switch (result.status) {
        case 'up-to-date':
            return (
                <p className='flex items-center justify-center gap-2 text-sm text-success'>
                    <CheckCircleFill size={14} />
                    You are up to date.
                </p>
            );

        case 'update-available':
            return (
                <>
                    <p className='flex items-center justify-center gap-2 text-sm text-warning'>
                        <ArrowUpCircleFill size={14} />
                        Version {result.version} is available.
                    </p>

                    {/* The app is unsigned, so there is no in-app install: downloading
                        opens the release page and the user runs the installer. */}
                    <div className='mt-3 flex justify-center gap-2'>
                        <button className='btn btn-warning btn-sm' onClick={onDownload}>
                            Download Now
                        </button>
                        <button className='btn btn-ghost btn-sm' onClick={() => onRemindLater(result.version)}>
                            Remind Me Later
                        </button>
                    </div>
                </>
            );

        case 'error':
            return (
                <p className='flex items-center justify-center gap-2 text-sm text-error'>
                    <ExclamationTriangleFill size={14} />
                    {result.error}
                </p>
            );

        case 'unsupported':
        default:
            return (
                <p className='flex items-center justify-center gap-2 text-sm opacity-70'>
                    <InfoCircleFill size={14} />
                    Update checks are not available yet.
                </p>
            );
    }
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [version, setVersion] = useState<string | null>(null);
    const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
    const [checking, setChecking] = useState(false);
    const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    // The version never changes while the app is running, so fetch it once.
    useEffect(() => {
        if (!open || version !== null) return;

        let cancelled = false;

        (async () => {
            try {
                const result = await window.electronAPI.getAppVersion();
                if (!cancelled) setVersion(result);
            } catch {
                if (!cancelled) setVersion('unknown');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, version]);

    const runUpdateCheck = useCallback(async () => {
        setChecking(true);

        try {
            const result = await window.electronAPI.checkForUpdates();
            setUpdate(result);
        } catch (err) {
            setUpdate({
                status: 'error',
                error: err instanceof Error ? err.message : String(err),
            });
        } finally {
            setChecking(false);
        }
    }, []);

    // Check automatically each time the modal is opened.
    useEffect(() => {
        if (!open) return;
        void runUpdateCheck();
    }, [open, runUpdateCheck]);

    const handleDownload = useCallback(() => {
        void window.electronAPI.openReleasePage();
    }, []);

    const handleRemindLater = useCallback(
        (version: string) => {
            window.electronAPI.snoozeUpdate(version);
            onClose();
        },
        [onClose]
    );

    return (
        <>
            <dialog ref={dialogRef} className='modal' onClose={onClose}>
                <div className='modal-box text-center'>
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <img src='/icons/icon.png' alt='' className='w-24 mx-auto' />

                    <h3 className='font-bold text-lg mt-2'>Storybook Packager</h3>
                    <p className='text-sm opacity-70'>Version {version ?? '—'}</p>

                    <div className='mt-4'>
                        <UpdateStatus result={update} checking={checking} onDownload={handleDownload} onRemindLater={handleRemindLater} />
                    </div>

                    <div className='mt-4 flex justify-center gap-1'>
                        <button className='btn btn-ghost btn-xs' onClick={() => setLegalDoc('terms')}>
                            Terms
                        </button>
                        <button className='btn btn-ghost btn-xs' onClick={() => setLegalDoc('privacy')}>
                            Privacy
                        </button>
                        <button className='btn btn-ghost btn-xs' onClick={() => setLegalDoc('license')}>
                            License
                        </button>
                    </div>

                    <p className='mt-2 text-xs opacity-60'>Copyright &copy; {currentYear} Ethan Lin. Sponsored by Excelsior University.</p>

                    <div className='modal-action justify-center'>
                        <button className='btn btn-primary' onClick={() => void runUpdateCheck()} disabled={checking}>
                            Check for Updates
                        </button>
                    </div>
                </div>
            </dialog>

            {/* A sibling rather than a child: a nested dialog's close event bubbles up and would close the About modal too. */}
            <LegalModal open={legalDoc !== null} activeDoc={legalDoc ?? 'terms'} onDocChange={setLegalDoc} onClose={() => setLegalDoc(null)} />
        </>
    );
}
