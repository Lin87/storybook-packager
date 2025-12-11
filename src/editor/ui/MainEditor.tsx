'use client';

import { useEditor } from '@/editor/state/EditorContext';
import SetupEditor from './SetupEditor';
import PageEditor from './PageEditor';

export default function MainEditor() {
    const { state } = useEditor();

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;
    const isPageSelected = state.selectedSectionIndex !== null && state.selectedPageIndex !== null;

    return (
        <div className='flex-1 p-6 overflow-auto'>
            {isSetupSelected && <SetupEditor />}
            {isPageSelected && <PageEditor />}
            {!isSetupSelected && !isPageSelected && <p className='text-gray-500 text-sm'>Select a section or page to begin editing.</p>}
        </div>
    );
}
