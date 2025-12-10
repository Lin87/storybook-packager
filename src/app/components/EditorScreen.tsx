'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditor } from '@/editor/state/EditorContext';
import Sidebar from '@/editor/ui/Sidebar';

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

    if (!state.xml) {
        return <p className='p-4'>Loading...</p>;
    }

    return (
        <div className='flex h-full w-full'>
            <Sidebar />

            <div className='flex-1 p-6'>
                {/* TEMP placeholder until Step 4 */}
                <h1 className='text-xl font-bold'>{state.xml.storybook.setup.title}</h1>

                <p className='text-sm text-gray-500'>
                    Selected:
                    {state.selectedSectionIndex === null && state.selectedPageIndex === null && ' Setup'}
                    {state.selectedSectionIndex !== null && state.selectedPageIndex === null && ` Section ${state.selectedSectionIndex + 1}`}
                    {state.selectedSectionIndex !== null && state.selectedPageIndex !== null && ` Section ${state.selectedSectionIndex + 1} → Page ${state.selectedPageIndex + 1}`}
                </p>
            </div>
        </div>
    );
}
