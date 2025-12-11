'use client';

import { useEditor } from '@/editor/state/EditorContext';

export default function SectionEditor() {
    const { state, dispatch } = useEditor();

    const sIndex = state.selectedSectionIndex!;
    const section = state.xml!.storybook.section[sIndex];

    const updateSectionTitle = (value: string) => {
        dispatch({
            type: 'renameSection',
            payload: { index: sIndex, title: value },
        });
    };

    return (
        <div className='space-y-4 max-w-xl'>
            <h2 className='text-xl font-semibold'>Section Settings</h2>

            {/* Section Title */}
            <div className='form-control'>
                <label className='label'>Section Title</label>
                <input className='input input-bordered' value={section.$?.title ?? ''} onChange={(e) => updateSectionTitle(e.target.value)} />
            </div>
        </div>
    );
}
