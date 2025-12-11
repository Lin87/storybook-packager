'use client';

import { useEditor } from '@/editor/state/EditorContext';
import SetupEditor from './SetupEditor';
import SectionEditor from './SectionEditor';
import PageEditor from './PageEditor';

export default function MainEditor() {
    const { state } = useEditor();

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;
    const sectionSelected = state.selectedSectionIndex !== null && state.selectedPageIndex === null;
    const pageSelected = state.selectedSectionIndex !== null && state.selectedPageIndex !== null;

    return (
        <div className='flex-1 p-5 overflow-auto'>
            {isSetupSelected && <SetupEditor />}
            {sectionSelected && <SectionEditor />}
            {pageSelected && <PageEditor />}
        </div>
    );
}
