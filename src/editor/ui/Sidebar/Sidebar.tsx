'use client';

import clsx from 'clsx';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';

import ConfirmDialog from '@/app/components/ConfirmDialog';
import DeleteButton from '@/app/components/DeleteButton';
import DragHandle from '@/app/components/DragHandle';
import { useEditor } from '@/editor/state/EditorContext';

import { ChevronDown, ChevronRight, Gear } from 'react-bootstrap-icons';

import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useSidebarDnD } from '@/editor/ui/Sidebar/useSidebarDnD';
import { getSectionTitle, getPageTitle } from '@/editor/ui/Sidebar/sidebarUtils';

/* =========================================================
   Types
========================================================= */

export interface SidebarHandle {
    revealPage: (sectionIndex: number, pageIndex: number) => void;
}

/* =========================================================
   Sortable Item Wrapper
========================================================= */

function SortableItem({ id, data, children }: { id: string; data: any; children: (args: { setNodeRef: (el: HTMLElement | null) => void; style: CSSProperties; attributes: any; listeners: any; isDragging: boolean }) => ReactNode }) {
    const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
        id,
        data,
        animateLayoutChanges: () => false,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    return children({
        setNodeRef,
        style,
        attributes,
        listeners,
        isDragging,
    });
}

/* =========================================================
   Section Drop Zone
========================================================= */

import { useDroppable } from '@dnd-kit/core';

function SectionPageDropZone({ sectionIndex, children }: { sectionIndex: number; children: ReactNode }) {
    const { setNodeRef } = useDroppable({
        id: `section-drop-${sectionIndex}`,
        data: {
            type: 'section-drop',
            sectionIndex,
        },
    });

    return <div ref={setNodeRef}>{children}</div>;
}

/* =========================================================
   Sidebar
========================================================= */

const Sidebar = forwardRef<SidebarHandle>(function Sidebar(_, ref) {
    const { state, dispatch } = useEditor();
    const xml = state.xml;
    const scrollRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

    if (!xml) {
        return <div className='w-64 bg-base-200 p-4 text-sm text-gray-400'>Loading…</div>;
    }

    const sections = Array.isArray(xml.storybook.section) ? xml.storybook.section : [xml.storybook.section];
    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
    const [sectionToDelete, setSectionToDelete] = useState<{ index: number } | null>(null);
    const [pageToDelete, setPageToDelete] = useState<{ section: number; page: number } | null>(null);
    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;

    /* =====================================================
       Drag & Drop (extracted)
    ===================================================== */

    const { activeDragItem, pageDropIndicator, handleDragStart, handleDragOver, handleDragEnd, clearIndicator } = useSidebarDnD({
        sections,
        collapsedSections,
        setCollapsedSections,
        dispatch,
    });

    /* =====================================================
       revealPage API
    ===================================================== */

    useImperativeHandle(ref, () => ({
        revealPage(sectionIndex, pageIndex) {
            setCollapsedSections((prev) => ({
                ...prev,
                [sectionIndex]: false,
            }));

            requestAnimationFrame(() => {
                const scrollEl = scrollRef.current;
                const pageEl = pageRefs.current[`${sectionIndex}-${pageIndex}`];
                if (!scrollEl || !pageEl) return;

                const containerTop = scrollEl.getBoundingClientRect().top;
                const containerHeight = scrollEl.clientHeight;
                const pageTop = pageEl.getBoundingClientRect().top;
                const pageHeight = pageEl.clientHeight;

                const offset = pageTop - containerTop - containerHeight / 2 + pageHeight / 2;

                scrollEl.scrollTo({
                    top: scrollEl.scrollTop + offset,
                    behavior: 'smooth',
                });
            });
        },
    }));

    /* =====================================================
       Render
    ===================================================== */

    return (
        <div className='w-84 xl:w-94 bg-base-200 border-r border-base-300 h-full flex flex-col'>
            {/* TOP */}
            <div className='flex bg-base-100 border-b border-base-300 p-2 justify-end'>
                <button
                    className={clsx('btn btn-xs btn-soft', isSetupSelected && 'btn-active')}
                    onClick={() =>
                        dispatch({
                            type: 'selectSection',
                            payload: { sectionIndex: null as never },
                        })
                    }>
                    <Gear size={16} />
                </button>
            </div>

            {/* SCROLLABLE */}
            <div ref={scrollRef} className='flex-1 overflow-y-auto p-2'>
                <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={clearIndicator}>
                    <SortableContext items={sections.map((_, i) => `section-${i}`)} strategy={verticalListSortingStrategy}>
                        {sections.map((section, sIndex) => {
                            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

                            return (
                                <SortableItem key={sIndex} id={`section-${sIndex}`} data={{ type: 'section', sectionIndex: sIndex }}>
                                    {({ setNodeRef, style, attributes, listeners }) => (
                                        <div ref={setNodeRef} style={style} className='mb-2'>
                                            {/* SECTION HEADER */}
                                            <div className='flex items-center gap-1'>
                                                <DragHandle attributes={attributes} listeners={listeners} />

                                                <button
                                                    className='btn btn-xs btn-ghost'
                                                    onClick={() =>
                                                        setCollapsedSections((p) => ({
                                                            ...p,
                                                            [sIndex]: !p[sIndex],
                                                        }))
                                                    }>
                                                    {collapsedSections[sIndex] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                </button>

                                                <div
                                                    className='flex-1 px-2 py-1 cursor-pointer rounded hover:bg-base-300'
                                                    onClick={() =>
                                                        dispatch({
                                                            type: 'selectSection',
                                                            payload: { sectionIndex: sIndex },
                                                        })
                                                    }>
                                                    {getSectionTitle(xml, sIndex)}
                                                </div>

                                                {sections.length > 1 && <DeleteButton onClick={() => setSectionToDelete({ index: sIndex })} />}
                                            </div>

                                            {/* PAGES */}
                                            <SectionPageDropZone sectionIndex={sIndex}>
                                                {!collapsedSections[sIndex] && (
                                                    <div className='ml-8 mt-1'>
                                                        <SortableContext items={pages.map((_, i) => `page-${sIndex}-${i}`)} strategy={verticalListSortingStrategy}>
                                                            {pages.map((page, pIndex) => (
                                                                <div key={pIndex}>
                                                                    {pageDropIndicator && pageDropIndicator.sectionIndex === sIndex && pageDropIndicator.pageIndex === pIndex && <div className='my-1 h-0.5 bg-primary rounded-full opacity-70' />}

                                                                    <SortableItem
                                                                        id={`page-${sIndex}-${pIndex}`}
                                                                        data={{
                                                                            type: 'page',
                                                                            sectionIndex: sIndex,
                                                                            pageIndex: pIndex,
                                                                        }}>
                                                                        {({ setNodeRef, style, attributes, listeners }) => (
                                                                            <div
                                                                                ref={(el) => {
                                                                                    setNodeRef(el);
                                                                                    pageRefs.current[`${sIndex}-${pIndex}`] = el;
                                                                                }}
                                                                                style={style}
                                                                                className='flex items-center text-sm rounded hover:bg-base-300'
                                                                                onClick={() =>
                                                                                    dispatch({
                                                                                        type: 'selectPage',
                                                                                        payload: {
                                                                                            sectionIndex: sIndex,
                                                                                            pageIndex: pIndex,
                                                                                        },
                                                                                    })
                                                                                }>
                                                                                <DragHandle attributes={attributes} listeners={listeners} />

                                                                                <span className='flex-1 px-3 py-1'>{getPageTitle(xml, sIndex, pIndex)}</span>
                                                                                <DeleteButton onClick={() => setPageToDelete({section: sIndex, page: pIndex})} />
                                                                            </div>
                                                                        )}
                                                                    </SortableItem>
                                                                </div>
                                                            ))}

                                                            {pages.length === 0 && pageDropIndicator?.sectionIndex === sIndex && <div className='my-2 h-0.5 bg-primary rounded-full opacity-70' />}
                                                        </SortableContext>
                                                    </div>
                                                )}
                                            </SectionPageDropZone>
                                        </div>
                                    )}
                                </SortableItem>
                            );
                        })}
                    </SortableContext>

                    <DragOverlay adjustScale={false} dropAnimation={{duration: 0, easing: 'linear'}}>
                        {activeDragItem?.type === 'section' && <div className='px-3 py-2 bg-base-300 rounded shadow text-sm'>{getSectionTitle(xml, activeDragItem.sectionIndex)}</div>}
                        {activeDragItem?.type === 'page' && <div className='px-3 py-1 bg-base-300 rounded shadow text-sm'>{getPageTitle(xml, activeDragItem.sectionIndex, activeDragItem.pageIndex)}</div>}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* BOTTOM */}
            <div className='p-2 bg-base-100 border-t border-base-300'>
                <button type='button' className='btn btn-primary w-full' onClick={() => dispatch({ type: 'addSection' })}>
                    + Add Section
                </button>
            </div>

            {/* MODALS */}
            <ConfirmDialog
                open={sectionToDelete !== null}
                title='Delete Section'
                message='A presentation must contain at least one section.'
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
                message='This will delete the selected page.'
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
});

export default Sidebar;
