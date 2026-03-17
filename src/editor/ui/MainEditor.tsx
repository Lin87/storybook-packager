'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
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
    const scrollRef = useRef<HTMLDivElement>(null);

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;
    const sectionSelected = state.selectedSectionIndex !== null && state.selectedPageIndex === null;
    const pageSelected = state.selectedSectionIndex !== null && state.selectedPageIndex !== null;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [state.selectedSectionIndex, state.selectedPageIndex]);

    return (
        <div ref={scrollRef} className={clsx('flex-1 overflow-auto p-5', isSetupSelected && 'preview')}>
            {isSetupSelected && <SetupEditor />}
            {sectionSelected && <SectionEditor sidebarRef={sidebarRef} />}
            {pageSelected && <PageEditor />}
        </div>
    );
}
