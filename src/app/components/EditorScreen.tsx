'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditor } from '@/editor/state/EditorContext';

export default function EditorScreen() {
    const searchParams = useSearchParams();
    const { state, dispatch } = useEditor();

    const pathParam = searchParams.get('path');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!pathParam) return;

        const fsPath = decodeURIComponent(pathParam);
        let cancelled = false;

        (async () => {
            try {
                const result = await window.electronAPI.loadPresentationData(fsPath);

                if (cancelled) return;

                if (result.success) {
                    dispatch({
                        type: 'loadXml',
                        payload: {
                            presentationPath: fsPath,
                            xml: result.data,
                        },
                    });

                    setError(null);
                } else {
                    setError(result.error ?? 'Failed to load XML');
                }
            } catch (err) {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pathParam, dispatch]);

    console.log("GLOBAL STATE:", state);
    
    // -----------------------------
    // Temporary debug UI
    // This will be replaced in Step 3
    // -----------------------------

    if (!pathParam) {
        return <p className='text-red-400'>No project path provided.</p>;
    }

    if (error) {
        return <p className='text-red-400'>Error loading presentation: {error}</p>;
    }

    if (!state.xml) {
        return <p className='text-gray-500'>Loading presentation...</p>;
    }

    return (
        <div className='p-4 space-y-2'>
            <h1 className='text-xl font-bold'>{state.xml.storybook.setup.title || '(Untitled Presentation)'}</h1>
            {state.xml.storybook.setup.author?.name && <p className='text-sm text-gray-600'>Author: {state.xml.storybook.setup.author.name}</p>}
            <p className='text-xs text-gray-400 mt-3'>Loaded from: {state.presentationPath}</p>
            <p className='text-xs text-gray-400'>Sections: {Array.isArray(state.xml.storybook.section) ? state.xml.storybook.section.length : 1}</p>
        </div>
    );
}
