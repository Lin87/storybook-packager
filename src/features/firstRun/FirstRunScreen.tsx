'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import AppTitleBar from '@/features/welcome/AppTitleBar';
import LegalDocumentViewer from '@/components/LegalDocumentViewer';
import { DEFAULT_LEGAL_DOC } from '@/lib/legal';
import type { LegalDocId } from '@/lib/legal';

/**
 * Shown instead of the welcome screen until the current Terms and Privacy Policy
 * are accepted. The LICENSE tab is informational: only the Terms and Privacy
 * Policy require agreement.
 */
export default function FirstRunScreen() {
    const [isMac, setIsMac] = useState(false);
    const [activeDoc, setActiveDoc] = useState<LegalDocId>(DEFAULT_LEGAL_DOC);
    const [agreed, setAgreed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        window.electronAPI.getPlatform().then(platform => {
            setIsMac(platform === 'darwin');
        });
    }, []);

    const accept = async () => {
        setSubmitting(true);

        try {
            await window.electronAPI.acceptLegal();
        } finally {
            // The window is closed by the main process once the acceptance is
            // recorded; re-enable the buttons if it somehow survives.
            setSubmitting(false);
        }
    };

    return (
        <div className='flex h-full flex-col'>
            {!isMac && <AppTitleBar />}

            <div className={clsx('flex min-h-0 flex-1 flex-col gap-4 bg-base-200 p-6', !isMac && 'pt-2')}>
                <div className='flex shrink-0 items-center gap-3 select-none'>
                    <img src='/icons/icon.png' alt='' className='w-12' />
                    <div>
                        <h1 className='text-xl font-bold'>Storybook Packager</h1>
                        <p className='text-sm opacity-70'>Before you begin, please review the Terms, Privacy Policy, and License.</p>
                    </div>
                </div>

                <LegalDocumentViewer activeDoc={activeDoc} onDocChange={setActiveDoc} />

                <div className='flex shrink-0 flex-col gap-3'>
                    <label className='flex flex-row items-center cursor-pointer gap-2 text-sm font-bold'>
                        <input type='checkbox' className='checkbox checkbox-sm' checked={agreed} onChange={event => setAgreed(event.target.checked)} />
                        <span>I have read and agree to the Terms and Conditions and the Privacy Policy.</span>
                    </label>

                    <div className='flex justify-end gap-2'>
                        <button className='btn btn-ghost' onClick={() => window.electronAPI.declineLegal()} disabled={submitting}>
                            Decline and Quit
                        </button>
                        <button className='btn btn-primary' onClick={() => void accept()} disabled={!agreed || submitting}>
                            Agree and Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
