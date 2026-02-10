'use client';

import type { RefObject } from 'react';
import { useEditor } from '@/editor/state/EditorContext';
import SetupEditor from './SetupEditor';
import SectionEditor from './SectionEditor';
import PageEditor from './PageEditor';
import { SidebarHandle } from './Sidebar/Sidebar';

interface MainEditorProps {
    sidebarRef: RefObject<SidebarHandle | null>;
}

export default function MainEditor({ sidebarRef }: MainEditorProps) {
    const { state } = useEditor();

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;
    const sectionSelected = state.selectedSectionIndex !== null && state.selectedPageIndex === null;
    const pageSelected = state.selectedSectionIndex !== null && state.selectedPageIndex !== null;

    return (
        <div className='flex-1 p-5 overflow-auto'>
            {isSetupSelected && <SetupEditor />}
            {sectionSelected && <SectionEditor sidebarRef={sidebarRef} />}
            {pageSelected && <PageEditor />}
        </div>
    );
}
