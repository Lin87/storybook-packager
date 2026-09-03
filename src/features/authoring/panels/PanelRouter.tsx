'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useAuthoring } from '@/features/authoring/state/AuthoringProvider';
import SetupPanel from './SetupPanel';
import SectionPanel from './SectionPanel';
import PagePanel from './PagePanel';
import { SidebarHandle } from '../sidebar/Sidebar';

interface PanelRouterProps {
    sidebarRef: RefObject<SidebarHandle | null>;
}

export default function PanelRouter({ sidebarRef }: PanelRouterProps) {
    const { state } = useAuthoring();
    const scrollRef = useRef<HTMLDivElement>(null);

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;
    const sectionSelected = state.selectedSectionIndex !== null && state.selectedPageIndex === null;
    const pageSelected = state.selectedSectionIndex !== null && state.selectedPageIndex !== null;

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }, [state.selectedSectionIndex, state.selectedPageIndex]);

    return (
        <div ref={scrollRef} className={clsx('flex-1 overflow-auto p-5', isSetupSelected && 'preview')}>
            {isSetupSelected && <SetupPanel />}
            {sectionSelected && <SectionPanel sidebarRef={sidebarRef} />}
            {pageSelected && <PagePanel />}
        </div>
    );
}
