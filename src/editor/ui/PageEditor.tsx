'use client';

import { useEditor } from '@/editor/state/EditorContext';

export default function PageEditor() {
    const { state, dispatch } = useEditor();

    const sIndex = state.selectedSectionIndex!;
    const pIndex = state.selectedPageIndex!;
    const page = state.xml!.storybook.section[sIndex].page[pIndex];

    const updatePageTitle = (value: string) => {
        dispatch({
            type: 'renamePage',
            payload: { sectionIndex: sIndex, pageIndex: pIndex, title: value },
        });
    };

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

            {/* Page Title */}
            <div className='form-control mt-4 max-w-lg'>
                <label className='label'>Page Title</label>
                <input className='input input-bordered' value={page.$?.title ?? ''} onChange={(e) => updatePageTitle(e.target.value)} />
            </div>

            <p className='text-gray-400 text-xs'>(Page-type-specific editor coming in future steps)</p>
        </div>
    );
}
