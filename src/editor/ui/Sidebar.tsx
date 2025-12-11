'use client';

import clsx from 'clsx';
import { useState } from 'react';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import DeleteButton from '@/app/components/DeleteButton';
import { useEditor } from '@/editor/state/EditorContext';
import { ChevronDown, ChevronRight, Gear } from 'react-bootstrap-icons';

export default function Sidebar() {
    const { state, dispatch } = useEditor();
    const xml = state.xml;

    if (!xml) {
        return <div className='w-64 bg-base-200 p-4 text-sm text-gray-400'>Loading...</div>;
    }

    const sections = Array.isArray(xml.storybook.section) ? xml.storybook.section : [xml.storybook.section];

    const [sectionToDelete, setSectionToDelete] = useState<{ index: number } | null>(null);
    const [pageToDelete, setPageToDelete] = useState<{ section: number; page: number } | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;

    return (
        <div className='w-84 xl:w-96 bg-base-200 border-r border-base-300 h-full flex flex-col'>
            {/* ---------- TOP FIXED REGION ---------- */}
            <div className='flex flex-wrap bg-base-100 border-b border-base-300 p-2 gap-2 justify-end'>
                <div className='tooltip tooltip-bottom' data-tip='Presentation Setup'>
                    <button
                        className={clsx('btn btn-xs btn-soft', isSetupSelected && 'btn-active')}
                        onClick={() =>
                            dispatch({
                                type: 'selectSection',
                                payload: { sectionIndex: null as never },
                            })
                        }>
                        <Gear size={16} />
                        <span className='sr-only'>Presentation Setup</span>
                    </button>
                </div>

                {/* (Future top buttons can go here) */}
            </div>

            {/* ---------- SCROLLABLE MIDDLE REGION ---------- */}
            <div className='flex-1 overflow-y-auto p-2'>
                {sections.map((section, sIndex) => {
                    const isSectionSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === null;

                    return (
                        <div key={sIndex} className='mb-2'>
                            {/* SECTION HEADER */}
                            <div className='flex items-center gap-1'>
                                {/* Collapse/Expand caret */}
                                <button
                                    className='btn btn-xs btn-ghost'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCollapsedSections((prev) => ({
                                            ...prev,
                                            [sIndex]: !prev[sIndex],
                                        }));
                                    }}>
                                    {collapsedSections[sIndex] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                </button>

                                {/* Select section */}
                                <div
                                    className={clsx('cursor-pointer px-2 py-2 rounded hover:bg-base-300 flex-1', isSectionSelected && 'bg-base-300 font-semibold')}
                                    onClick={() =>
                                        dispatch({
                                            type: 'selectSection',
                                            payload: { sectionIndex: sIndex },
                                        })
                                    }>
                                    {section.$?.title || `Section ${sIndex + 1}`}
                                </div>

                                {/* Delete Section (hidden if only one) */}
                                {sections.length > 1 && (
                                    <DeleteButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSectionToDelete({ index: sIndex });
                                        }}
                                    />
                                )}
                            </div>

                            {/* PAGES (only if section is expanded) */}
                            {!collapsedSections[sIndex] && (
                                <div className='ml-8 mt-1 flex flex-col gap-1'>
                                    {(Array.isArray(section.page) ? section.page : section.page ? [section.page] : []).map((page, pIndex) => {
                                        const isPageSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === pIndex;

                                        return (
                                            <div
                                                key={pIndex}
                                                className={clsx('cursor-pointer flex items-center text-sm', isPageSelected && 'bg-base-300 font-semibold')}
                                                onClick={() =>
                                                    dispatch({
                                                        type: 'selectPage',
                                                        payload: {
                                                            sectionIndex: sIndex,
                                                            pageIndex: pIndex,
                                                        },
                                                    })
                                                }>
                                                <span className='block px-3 py-1 rounded hover:bg-base-300 flex-1'>{page.$?.title || `Page ${pIndex + 1}`}</span>

                                                {/* Delete Page */}
                                                <DeleteButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPageToDelete({
                                                            section: sIndex,
                                                            page: pIndex,
                                                        });
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Add Page */}
                                    <button
                                        className='btn btn-sm btn-soft mt-1 w-full'
                                        onClick={() =>
                                            dispatch({
                                                type: 'addPage',
                                                payload: {
                                                    sectionIndex: sIndex,
                                                    pageType: 'image',
                                                },
                                            })
                                        }>
                                        + Add Page
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ---------- BOTTOM FIXED REGION ---------- */}
            <div className='p-2 bg-base-100 border-t border-base-300'>
                <button className='btn btn-primary w-full' onClick={() => dispatch({ type: 'addSection' })}>
                    + Add Section
                </button>
            </div>

            {/* ---------- MODALS ---------- */}
            <ConfirmDialog
                open={sectionToDelete !== null}
                title='Delete Section'
                message='The pages in this section will be moved into an adjacent section. A presentation must contain at least one section.'
                confirmLabel='Delete Section'
                onConfirm={() => {
                    if (sectionToDelete) {
                        dispatch({
                            type: 'removeSection',
                            payload: { index: sectionToDelete.index },
                        });
                    }
                    setSectionToDelete(null);
                }}
                onCancel={() => setSectionToDelete(null)}
            />

            <ConfirmDialog
                open={pageToDelete !== null}
                title='Delete Page?'
                message='This will delete the selected page. This action cannot be undone.'
                onConfirm={() => {
                    if (pageToDelete) {
                        dispatch({
                            type: 'removePage',
                            payload: {
                                sectionIndex: pageToDelete.section,
                                pageIndex: pageToDelete.page,
                            },
                        });
                    }
                    setPageToDelete(null);
                }}
                onCancel={() => setPageToDelete(null)}
            />
        </div>
    );
}
