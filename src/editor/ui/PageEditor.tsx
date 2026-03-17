'use client';

import { useMemo } from 'react';
import { useEditor } from '@/editor/state/EditorContext';
import { getPageEditorRegistration } from './pageEditors/registry';

function asArray<T>(v: T | T[] | undefined): T[] {
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
}

export default function PageEditorHost() {
    const { state } = useEditor();

    const sIndex = state.selectedSectionIndex;
    const pIndex = state.selectedPageIndex;

    const section = !state.xml || sIndex === null ? null : asArray(state.xml.storybook.section)[sIndex];
    const page = section && pIndex !== null ? asArray(section.page)[pIndex] : null;
    const type = page?.$?.type ?? 'unknown';
    const registration = useMemo(() => getPageEditorRegistration(type), [type]);
    const Editor = registration.Editor;

    if (!state.xml || sIndex === null || pIndex === null) return null;

    if (!section || !page) {
        return (
            <div className='text-sm opacity-70'>
                The selected page could not be found. (sectionIndex={sIndex}, pageIndex={pIndex})
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <div>
                <h2 className='text-xl font-semibold'>{registration.label}</h2>
                <div className='text-xs opacity-70'>
                    Type: <span className='font-mono'>{type}</span>
                </div>
            </div>

            <Editor sectionIndex={sIndex} pageIndex={pIndex} />
        </div>
    );
}
