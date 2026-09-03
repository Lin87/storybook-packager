'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LEGAL_DOCS } from '@/lib/legal';
import type { LegalDocId } from '@/lib/legal';

interface LegalDocumentViewerProps {
    activeDoc: LegalDocId;
    onDocChange: (doc: LegalDocId) => void;
}

/**
 * Tabbed reader for the Terms, Privacy Policy, and LICENSE. The fragments under
 * public/legal/ are generated from docs/legal/*.md and the root LICENSE by
 * env-scripts/build-legal-docs.mjs, so they are trusted build output rather than
 * user input.
 */
export default function LegalDocumentViewer({ activeDoc, onDocChange }: LegalDocumentViewerProps) {
    const [documents, setDocuments] = useState<Partial<Record<LegalDocId, string>>>({});
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const doc = LEGAL_DOCS.find(entry => entry.id === activeDoc) ?? LEGAL_DOCS[0];
    const html = documents[doc.id];

    // Each document is fetched at most once, then kept for later tab switches.
    useEffect(() => {
        if (html !== undefined) {
            setError(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const response = await fetch(doc.htmlPath);
                if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

                const content = await response.text();
                if (!cancelled) {
                    setDocuments(previous => ({ ...previous, [doc.id]: content }));
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [doc.htmlPath, doc.id, html, attempt]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [activeDoc]);

    /**
     * The app has no way to open external links, so in-app tab links are handled
     * here and anything else is swallowed rather than opening a bare window.
     */
    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const anchor = (event.target as HTMLElement).closest('a');
            if (!anchor) return;

            event.preventDefault();

            const target = LEGAL_DOCS.find(entry => anchor.getAttribute('href') === `#legal-${entry.id}`);
            if (target) onDocChange(target.id);
        },
        [onDocChange],
    );

    return (
        <div className='flex flex-col min-h-0 flex-1'>
            <div role='tablist' className='tabs tabs-border shrink-0'>
                {LEGAL_DOCS.map(entry => (
                    <button
                        key={entry.id}
                        role='tab'
                        className={`tab ${entry.id === doc.id ? 'tab-active' : ''}`}
                        onClick={() => onDocChange(entry.id)}
                    >
                        {entry.title}
                    </button>
                ))}
            </div>

            {doc.note && <p className='shrink-0 px-1 pt-2 text-xs opacity-70'>{doc.note}</p>}

            <div ref={scrollRef} className='mt-2 flex-1 min-h-0 overflow-y-auto rounded-md border border-base-100 bg-base-300 p-4' onClick={handleClick}>
                {html !== undefined ? (
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                ) : error ? (
                    <div className='flex flex-col items-center gap-3 py-8 text-center'>
                        <p className='text-sm text-error'>The document could not be loaded.</p>
                        <p className='text-xs opacity-70'>
                            The full text is available in <code>docs/legal/</code> and <code>LICENSE</code> in the project repository.
                        </p>
                        <button className='btn btn-sm' onClick={() => setAttempt(value => value + 1)}>
                            Try Again
                        </button>
                    </div>
                ) : (
                    <div className='flex justify-center py-8'>
                        <span className='loading loading-spinner' />
                    </div>
                )}
            </div>
        </div>
    );
}
