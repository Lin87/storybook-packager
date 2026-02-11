'use client';

import { useMemo } from 'react';
import { useEditor } from '@/editor/state/EditorContext';
import type { PageEditorProps } from './types';

function asArray<T>(v: T | T[] | undefined): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

export default function GenericPageEditor({ sectionIndex, pageIndex }: PageEditorProps) {
    const { state, dispatch } = useEditor();

    const page = useMemo(() => {
        const xml = state.xml;
        if (!xml) return null;
        const section = asArray(xml.storybook.section)[sectionIndex];
        return asArray(section?.page)[pageIndex] ?? null;
    }, [state.xml, sectionIndex, pageIndex]);

    if (!page) return <div className='text-sm opacity-70'>Page not found.</div>;

    return (
        <div className='space-y-4'>
            <div className='text-sm opacity-70'>
                <div>
                    <span className='font-semibold'>Page Type:</span> {page.$?.type ?? 'unknown'}
                </div>
                {page.$?.src && (
                    <div>
                        <span className='font-semibold'>Source:</span> <span className='font-mono'>{page.$.src}</span>
                    </div>
                )}
            </div>

            <div className='form-control max-w-xl'>
                <label className='label'>
                    <span className='label-text'>Page Title</span>
                </label>
                <input
                    className='input input-bordered'
                    value={page.$?.title ?? ''}
                    onChange={(e) =>
                        dispatch({
                            type: 'renamePage',
                            payload: { sectionIndex, pageIndex, title: e.target.value },
                        })
                    }
                    placeholder='Untitled page'
                />
            </div>

            <div className='text-xs opacity-60'>Page-type-specific editing will appear here as we add editors for each page type.</div>
        </div>
    );
}
