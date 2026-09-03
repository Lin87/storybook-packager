'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthoring } from '@/features/authoring/state/AuthoringProvider';
import PanelRouter from '@/features/authoring/panels/PanelRouter';
import Sidebar, { SidebarHandle } from '@/features/authoring/sidebar/Sidebar';
import { showToast } from '@/components/toast';
import AboutModal from '@/components/AboutModal';

export default function AuthoringScreen() {
    const searchParams = useSearchParams();
    const { state, dispatch } = useAuthoring();

    const pathParam = searchParams.get('path');
    const [error, setError] = useState<string | null>(null);
    const [aboutOpen, setAboutOpen] = useState(false);

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

    useEffect(() => {
        if (!state.xml) return;

        const rawTitle = state.xml.storybook?.setup?.title;
        const presentationTitle = (typeof rawTitle === 'string' ? rawTitle : rawTitle?.[0])?.trim() || '';

        const name = presentationTitle || (state.presentationPath ? state.presentationPath.split(/[/\\]/).pop() : '') || 'Untitled';

        // IMPORTANT: no '*' here — main process will add it on Windows/Linux only
        const base = `${name} - Storybook Packager`;

        window.electronAPI.setWindowTitle(base, state.dirty);
    }, [state.xml, state.dirty, state.presentationPath]);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onMenuFileSave(async (request) => {
            if (!state.xml || !state.presentationPath) {
                const result = { success: false as const, error: 'No presentation is loaded.' };
                if (request.reason === 'menu') {
                    showToast(result.error, 'error');
                }
                return result;
            }

            const result = await request.save({
                presentationPath: state.presentationPath,
                xml: state.xml,
            });

            if (result.success) {
                dispatch({ type: 'clearDirty' });

                if (request.reason === 'menu') {
                    showToast('Presentation saved.', 'success');
                }
            } else {
                if (request.reason === 'menu') {
                    showToast(`Failed to save presentation. ${result.error}`, 'error');
                }
            }

            return result;
        });
        return unsubscribe;
    }, [dispatch, state.presentationPath, state.xml]);

    useEffect(() => {
        const unsubSaveAs = window.electronAPI.onMenuFileSaveAs(async (request) => {
            if (!state.xml || !state.presentationPath) {
                const result = { success: false as const, error: 'No presentation is loaded.' };
                if (request.reason === 'menu') {
                    showToast(result.error, 'error');
                }
                return result;
            }

            const result = await request.saveAs({
                presentationPath: state.presentationPath,
                xml: state.xml,
            });

            if (result === null) {
                return null;
            }

            if (result.success) {
                dispatch({
                    type: 'setPresentationPath',
                    payload: { presentationPath: result.path },
                });
                dispatch({ type: 'clearDirty' });

                if (request.reason === 'menu') {
                    showToast('Presentation saved to a new location.', 'success');
                }
            } else {
                if (request.reason === 'menu') {
                    showToast(`Failed to save presentation. ${result.error}`, 'error');
                }
            }

            return result;
        });

        return () => {
            unsubSaveAs();
        };
    }, [dispatch, state.presentationPath, state.xml]);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onMenuHelpAbout(() => {
            setAboutOpen(true);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        window.electronAPI.setEditorDirty(state.dirty);
    }, [state.dirty]);

    let content;

    if (error) {
        content = <p className='p-4 text-error'>{error}</p>;
    } else if (!state.xml) {
        content = <p className='p-4'>Loading...</p>;
    } else {
        content = (
            <div className='flex h-full w-full overflow-hidden'>
                <Sidebar ref={sidebarRef} />
                <PanelRouter sidebarRef={sidebarRef} />
            </div>
        );
    }

    return (
        <>
            {content}
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </>
    );
}
