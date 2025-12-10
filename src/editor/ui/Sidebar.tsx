'use client';

import { useEditor } from '@/editor/state/EditorContext';
import clsx from 'clsx';

export default function Sidebar() {
    const { state, dispatch } = useEditor();
    const xml = state.xml;

    if (!xml) {
        return <div className='w-64 bg-base-200 p-4 text-sm text-gray-400'>Loading...</div>;
    }

    const sections = Array.isArray(xml.storybook.section) ? xml.storybook.section : [xml.storybook.section];

    return (
        <div className='w-64 bg-base-200 border-r border-base-300 h-full overflow-y-auto p-2 flex flex-col gap-2'>
            {/* SETUP NODE */}
            <div
                className={clsx('cursor-pointer px-3 py-2 rounded hover:bg-base-300', state.selectedSectionIndex === null && state.selectedPageIndex === null && 'bg-base-300 font-semibold')}
                onClick={() =>
                    dispatch({
                        type: 'selectSection',
                        payload: { sectionIndex: null as never }, // workaround to select "Setup"
                    })
                }>
                📘 Presentation Setup
            </div>

            {/* SECTIONS */}
            <div className='mt-2'>
                {sections.map((section, sIndex) => {
                    const isSectionSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === null;

                    return (
                        <div key={sIndex} className='mb-1'>
                            {/* SECTION HEADER */}
                            <div
                                className={clsx('cursor-pointer px-3 py-2 rounded hover:bg-base-300 flex items-center justify-between', isSectionSelected && 'bg-base-300 font-semibold')}
                                onClick={() =>
                                    dispatch({
                                        type: 'selectSection',
                                        payload: { sectionIndex: sIndex },
                                    })
                                }>
                                <span>📂 {section.$?.title || `Section ${sIndex + 1}`}</span>
                            </div>

                            {/* PAGES */}
                            <div className='ml-5 mt-1 flex flex-col gap-1'>
                                {(Array.isArray(section.page) ? section.page : section.page ? [section.page] : []).map((page, pIndex) => {
                                    const isPageSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === pIndex;

                                    return (
                                        <div
                                            key={pIndex}
                                            className={clsx('cursor-pointer px-3 py-1 rounded hover:bg-base-300', isPageSelected && 'bg-base-300 font-semibold')}
                                            onClick={() =>
                                                dispatch({
                                                    type: 'selectPage',
                                                    payload: { sectionIndex: sIndex, pageIndex: pIndex },
                                                })
                                            }>
                                            📄 {page.$?.title || `Page ${pIndex + 1}`}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
