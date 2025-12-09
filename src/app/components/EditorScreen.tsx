'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StorybookXml } from '@/types/sbplus';

function EditorScreen() {
    const searchParams = useSearchParams();
    const pathParam = searchParams.get('path');
    const [data, setData] = useState<StorybookXml | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pathParam) return;

        const fsPath = decodeURIComponent(pathParam); // undo encodeURI from main.ts
        let cancelled = false;

        (async () => {
            try {
                const result = await window.electronAPI.loadPresentationData(fsPath);

                if (cancelled) return;

                if (result.success) {
                    setData(result.data);
                    setError(null);
                } else {
                    setError(result.error || 'Failed to load presentation data.');
                }
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pathParam]);

    if (!pathParam) {
        return <p className='text-red-400 text-sm'>No presentation path provided in the URL.</p>;
    }

    if (error) {
        return <p className='text-red-400 text-sm'>Error loading presentation: {error}</p>;
    }

    if (!data) {
        return <p className='text-gray-500'>Loading...</p>;
    }

    const sections = Array.isArray(data.storybook.section) ? data.storybook.section : [data.storybook.section];

    return (
        <div className='p-6 space-y-2'>
            <h1 className='text-2xl font-bold'>{data.storybook.setup.title ?? '(Untitled presentation)'}</h1>
            {data.storybook.setup.author && <p className='text-sm text-gray-500'>Author: {data.storybook.setup.author.name}</p>}
            {data.storybook.setup.subtitle && <p className='text-sm text-gray-400'>Subtitle: {data.storybook.setup.subtitle}</p>}
            {data.storybook.setup.length && <p className='text-xs text-gray-500'>Approx. length: {data.storybook.setup.length}</p>}
            <p className='text-sm mt-4'>Sections: {sections.length}</p>
        </div>
    );
}

export default EditorScreen;
