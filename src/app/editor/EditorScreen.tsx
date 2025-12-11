'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditor } from '@/editor/state/EditorContext';
import MainEditor from '@/editor/ui/MainEditor';
import Sidebar, { SidebarHandle } from '@/editor/ui/Sidebar';

export default function EditorScreen() {
    const searchParams = useSearchParams();
    const { state, dispatch } = useEditor();

    const pathParam = searchParams.get('path');
    const [error, setError] = useState<string | null>(null);

    const sidebarRef = useRef<SidebarHandle>(null);

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
            <Sidebar ref={sidebarRef} />
            <MainEditor sidebarRef={sidebarRef}  />
        </div>
    );
}
