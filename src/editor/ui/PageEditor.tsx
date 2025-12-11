'use client';

import { useEditor } from '@/editor/state/EditorContext';

export default function PageEditor() {
    const { state } = useEditor();

    const sIndex = state.selectedSectionIndex!;
    const pIndex = state.selectedPageIndex!;

    const page = state.xml!.storybook.section[sIndex].page[pIndex];

    return (
        <div className='space-y-4'>
            <h2 className='text-xl font-semibold'>Page Editor</h2>

            <div className='text-sm text-gray-600'>
                <p>
                    <strong>Page Type:</strong> {page.$?.type}
                </p>
                {page.$?.title && (
                    <p>
                        <strong>Title:</strong> {page.$?.title}
                    </p>
                )}
                {page.$?.src && (
                    <p>
                        <strong>Source:</strong> {page.$?.src}
                    </p>
                )}
            </div>

            <p className='text-gray-400 text-xs'>(Page-type-specific editor coming in future steps)</p>
        </div>
    );
}
