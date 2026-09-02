'use client';

import { useAuthoring } from '@/features/authoring/state/AuthoringProvider';
import { ChevronDoubleRight } from 'react-bootstrap-icons';
import type { RefObject } from 'react';
import { SidebarHandle } from '../sidebar/Sidebar';

interface SectionEditorProps {
    sidebarRef: RefObject<SidebarHandle | null>;
}

export default function SectionEditor({ sidebarRef }: SectionEditorProps) {
    const { state, dispatch } = useAuthoring();

    const sIndex = state.selectedSectionIndex!;
    const section = Array.isArray(state.xml!.storybook.section) ? state.xml!.storybook.section[sIndex] : state.xml!.storybook.section;

    const updateSectionTitle = (value: string) => {
        dispatch({
            type: 'renameSection',
            payload: { index: sIndex, title: value },
        });
    };

    const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

    return (
        <div className='space-y-6'>
            <h2 className='text-2xl font-semibold'>Section</h2>

            {/* SECTION TITLE */}
            <label className='floating-label'>
                <input className='input input-lg w-full' value={section.$?.title ?? ''} onChange={(e) => updateSectionTitle(e.target.value)} />
                <span>Title</span>
            </label>

            {/* PAGES LIST */}
            <div>
                <h3 className='text-lg font-semibold mb-2'>Pages in this Section</h3>

                {pages.length === 0 && <p className='text-sm text-gray-500'>This section has no pages yet.</p>}

                <ul className='list bg-base-100 rounded-box shadow-md'>
                    {pages.map((page, pIndex) => (
                        <li key={pIndex} className='list-row'>
                            <div className='list-col-grow'>
                                <div>{page.$?.title || `Page ${pIndex + 1}`}</div>
                                <div className='text-xs uppercase opacity-60'>{page.$?.type || 'unknown'}</div>
                            </div>
                            <button
                                className='btn btn-square btn-ghost'
                                onClick={() => {
                                    dispatch({
                                        type: 'selectPage',
                                        payload: {
                                            sectionIndex: sIndex,
                                            pageIndex: pIndex,
                                        },
                                    });
                                    sidebarRef.current?.revealPage(sIndex, pIndex);
                                }}>
                                <ChevronDoubleRight size={16} />
                                <span className='sr-only'>Go</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
