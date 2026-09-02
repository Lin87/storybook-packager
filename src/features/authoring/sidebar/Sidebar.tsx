'use client';

import clsx from 'clsx';
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

import ConfirmDialog from '@/components/ConfirmDialog';
import DeleteButton from '@/components/DeleteButton';
import DragHandle from '@/components/DragHandle';
import { showToast } from '@/components/toast';
import { useEditor } from '@/features/authoring/state/AuthoringProvider';

import { FileEarmarkZip, ChevronDown, ChevronRight, FolderCheck, Gear } from 'react-bootstrap-icons';

import { DndContext, closestCenter, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useSidebarDnD } from './useSidebarDnD';
import type { SidebarDragItem } from './useSidebarDnD';
import { getSectionTitle, getPageTitle } from './sidebarUtils';

/* =========================================================
   Types
========================================================= */

export interface SidebarHandle {
    revealPage: (sectionIndex: number, pageIndex: number) => void;
}

/* =========================================================
   Sortable Item Wrapper
========================================================= */

type SortableRenderArgs = {
    setNodeRef: (el: HTMLElement | null) => void;
    style: CSSProperties;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
    isDragging: boolean;
};

function SortableItem({ id, data, children }: { id: string; data: SidebarDragItem; children: (args: SortableRenderArgs) => ReactNode }) {
    const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
        id,
        data,
        animateLayoutChanges: () => false,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1, // hide in-list placeholder while using DragOverlay
    };

    return children({ setNodeRef, style, attributes, listeners, isDragging });
}

/* =========================================================
   Section Drop Zone
   (enables dropping a page into a section header area)
========================================================= */

function SectionPageDropZone({ sectionIndex, children }: { sectionIndex: number; children: ReactNode }) {
    const { setNodeRef } = useDroppable({
        id: `section-drop-${sectionIndex}`,
        data: { type: 'section-drop', sectionIndex },
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
    const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
    const [sectionToDelete, setSectionToDelete] = useState<{ index: number } | null>(null);
    const [pageToDelete, setPageToDelete] = useState<{ section: number; page: number } | null>(null);
    const [validating, setValidating] = useState(false);
    const [exporting, setExporting] = useState(false);

    const sections = xml ? (Array.isArray(xml.storybook.section) ? xml.storybook.section : [xml.storybook.section]) : [];

    const isSetupSelected = state.selectedSectionIndex === null && state.selectedPageIndex === null;

    const { activeDragItem, pageDropIndicator, handleDragStart, handleDragMove, handleDragOver, handleDragEnd, handleDragCancel } = useSidebarDnD({
        sections,
        collapsedSections,
        setCollapsedSections,
        dispatch,
        scrollContainerRef: scrollRef,
    });

    /* -----------------------------
       Selection helpers
    ------------------------------ */

    const selectSetup = () => {
        dispatch({ type: 'selectSetup' });
    };

    const selectSection = (sectionIndex: number) => {
        dispatch({
            type: 'selectSection',
            payload: { sectionIndex },
        });
    };

    const selectPage = (sectionIndex: number, pageIndex: number) => {
        dispatch({
            type: 'selectPage',
            payload: { sectionIndex, pageIndex },
        });
    };

    /* -----------------------------
       UI helpers
    ------------------------------ */

    const toggleSectionCollapsed = (sectionIndex: number) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [sectionIndex]: !prev[sectionIndex],
        }));
    };

    const addPageToSection = (sectionIndex: number) => {
        dispatch({
            type: 'addPage',
            payload: { sectionIndex, pageType: 'image' },
        });
    };

    const getPresentationTitle = () => {
        const title = state.xml?.storybook.setup?.title;
        return (typeof title === 'string' ? title : '').trim() || state.presentationPath.split(/[/\\]/).pop() || 'Untitled';
    };

    const validatePresentation = async () => {
        if (!state.xml || !state.presentationPath) return;

        setValidating(true);
        try {
            const result = await window.electronAPI.validatePresentation({
                presentationPath: state.presentationPath,
                xml: state.xml,
            });

            if (result.success) {
                const windowResult = await window.electronAPI.showValidationResults({
                    result: result.result,
                    presentationTitle: getPresentationTitle(),
                });
                if (!windowResult.success) {
                    showToast(`Could not open validation window. ${windowResult.error}`, 'error');
                }

                const { errors, warnings } = result.result.summary;
                if (errors > 0) {
                    showToast(`Validation found ${errors} error${errors === 1 ? '' : 's'}.`, 'error');
                } else if (warnings > 0) {
                    showToast(`Validation found ${warnings} warning${warnings === 1 ? '' : 's'}.`, 'warning');
                } else {
                    showToast('Presentation validation passed.', 'success');
                }
            } else {
                showToast(`Validation failed. ${result.error}`, 'error');
            }
        } finally {
            setValidating(false);
        }
    };

    const exportPresentation = async () => {
        if (!state.xml || !state.presentationPath) return;

        setExporting(true);
        try {
            const result = await window.electronAPI.exportPresentationPackage({
                presentationPath: state.presentationPath,
                xml: state.xml,
            });

            if (result === null) {
                return;
            }

            if (result.success) {
                const { errors, warnings } = result.validation.summary;
                showToast(`Package exported to ${result.path}.`, 'success');

                if (errors > 0 || warnings > 0) {
                    await window.electronAPI.showValidationResults({
                        result: result.validation,
                        presentationTitle: getPresentationTitle(),
                    });
                }
                return;
            }

            showToast(`Export failed. ${result.error}`, 'error');
        } finally {
            setExporting(false);
        }
    };

    /* -----------------------------
       revealPage API (imperative)
       Used by SectionEditor "Go" button
    ------------------------------ */

    useImperativeHandle(ref, () => ({
        revealPage(sectionIndex, pageIndex) {
            // Ensure the target section is visible before trying to scroll to the page
            setCollapsedSections((prev) => ({ ...prev, [sectionIndex]: false }));

            requestAnimationFrame(() => {
                const scrollEl = scrollRef.current;
                const pageEl = pageRefs.current[`${sectionIndex}-${pageIndex}`];
                if (!scrollEl || !pageEl) return;

                // Center the page row in the scroll container when possible
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

    useEffect(() => {
        const sIndex = state.selectedSectionIndex;
        if (sIndex === null) return;

        // Auto-expand selected section (covers newly added section too)
        setCollapsedSections((prev) => {
            if (prev[sIndex] === false || prev[sIndex] == null) return prev;
            return { ...prev, [sIndex]: false };
        });

        // Scroll selected section into view (centered if possible)
        requestAnimationFrame(() => {
            const scrollEl = scrollRef.current;
            const sectionEl = sectionRefs.current[sIndex];
            if (!scrollEl || !sectionEl) return;

            const containerRect = scrollEl.getBoundingClientRect();
            const itemRect = sectionEl.getBoundingClientRect();

            const itemTop = itemRect.top - containerRect.top;
            const itemBottom = itemRect.bottom - containerRect.top;

            // Only scroll if out of view
            if (itemTop >= 0 && itemBottom <= scrollEl.clientHeight) return;

            const targetOffset = itemTop - scrollEl.clientHeight / 2 + itemRect.height / 2;

            scrollEl.scrollTo({
                top: scrollEl.scrollTop + targetOffset,
                behavior: 'smooth',
            });
        });
    }, [state.selectedSectionIndex, setCollapsedSections]);

    if (!xml) {
        return <div className='w-64 bg-base-200 p-4 text-sm text-gray-400'>Loading...</div>;
    }

    /* -----------------------------
       Render helpers
    ------------------------------ */

    const renderPageRow = (sIndex: number, pIndex: number) => {
        const isPageSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === pIndex;

        return (
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
                            className={clsx('flex items-center min-h-10 text-sm cursor-pointer  ')}
                            onClick={() => selectPage(sIndex, pIndex)}>
                            <DragHandle attributes={attributes} listeners={listeners} />

                            <div className={clsx('flex-1 px-3 py-1 mr-1 rounded hover:bg-blue-600 hover:text-white select-none', isPageSelected && 'bg-blue-600 text-white')}>{getPageTitle(xml, sIndex, pIndex)}</div>

                            <DeleteButton onClick={() => setPageToDelete({ section: sIndex, page: pIndex })} />
                        </div>
                    )}
                </SortableItem>
            </div>
        );
    };

    return (
        <div className='w-84 xl:w-94 bg-base-200 border-r border-base-300 h-full flex flex-col'>
            {/* Top (fixed) */}
            <div className='flex bg-base-100 border-b border-base-300 p-2 justify-end gap-2 preview'>
                <button type='button' className='btn btn-xs btn-soft' onClick={validatePresentation} disabled={validating} title='Validate Presentation'>
                    <FolderCheck size={14} />
                    <span className='hidden xl:inline'>{validating ? 'Validating' : 'Validate'}</span>
                </button>
                <button type='button' className='btn btn-xs btn-soft' onClick={exportPresentation} disabled={exporting} title='Export Package'>
                    <FileEarmarkZip size={14} />
                    <span className='hidden xl:inline'>{exporting ? 'Exporting' : 'Export'}</span>
                </button>
                <button type='button' className={clsx('btn btn-xs btn-soft', isSetupSelected && 'btn-active')} onClick={selectSetup} title='Presentation Settings'>
                    <Gear size={14} />
                </button>
            </div>

            {/* Middle (scrollable) */}
            <div ref={scrollRef} className='flex-1 overflow-y-auto p-2 overscroll-contain'>
                <DndContext autoScroll={false} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                    <SortableContext items={sections.map((_, i) => `section-${i}`)} strategy={verticalListSortingStrategy}>
                        {sections.map((section, sIndex) => {
                            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];
                            const isSectionSelected = state.selectedSectionIndex === sIndex && state.selectedPageIndex === null;
                            const isCollapsed = !!collapsedSections[sIndex];

                            return (
                                <SortableItem key={sIndex} id={`section-${sIndex}`} data={{ type: 'section', sectionIndex: sIndex }}>
                                    {({ setNodeRef, style, attributes, listeners }) => (
                                        <div
                                            ref={(el) => {
                                                setNodeRef(el);
                                                sectionRefs.current[sIndex] = el;
                                            }}
                                            style={style}
                                            className='mb-2'>
                                            {/* Section header */}
                                            <div className='flex items-center'>
                                                <DragHandle attributes={attributes} listeners={listeners} />

                                                <button type='button' className='btn btn-xs btn-ghost px-1' onClick={() => toggleSectionCollapsed(sIndex)}>
                                                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                </button>

                                                <div className={clsx('flex items-center flex-1 px-2 py-1 mr-1 min-h-10 cursor-pointer rounded hover:bg-blue-600 hover:text-white', isSectionSelected && 'bg-blue-600 text-white')} onClick={() => selectSection(sIndex)}>
                                                    {getSectionTitle(xml, sIndex)}
                                                </div>

                                                {sections.length > 1 && <DeleteButton onClick={() => setSectionToDelete({ index: sIndex })} />}
                                            </div>

                                            {/* Pages (only when expanded) */}
                                            <SectionPageDropZone sectionIndex={sIndex}>
                                                {!isCollapsed && (
                                                    <div className='ml-5.5 mt-1'>
                                                        <SortableContext items={pages.map((_, i) => `page-${sIndex}-${i}`)} strategy={verticalListSortingStrategy}>
                                                            {pages.map((_, pIndex) => renderPageRow(sIndex, pIndex))}

                                                            {pages.length === 0 && pageDropIndicator?.sectionIndex === sIndex && <div className='my-2 h-0.5 bg-primary rounded-full opacity-70' />}
                                                        </SortableContext>

                                                        <button type='button' className='btn btn-sm btn-soft mt-2 w-full' onClick={() => addPageToSection(sIndex)}>
                                                            + Add Page
                                                        </button>
                                                    </div>
                                                )}
                                            </SectionPageDropZone>
                                        </div>
                                    )}
                                </SortableItem>
                            );
                        })}
                    </SortableContext>

                    {/* Drag preview (overlay). Disable drop animation to avoid snap-back feel. */}
                    <DragOverlay adjustScale={false} dropAnimation={null}>
                        {activeDragItem?.type === 'section' && <div className='px-3 py-2 bg-base-300 rounded shadow text-sm'>{getSectionTitle(xml, activeDragItem.sectionIndex)}</div>}

                        {activeDragItem?.type === 'page' && <div className='px-3 py-1 bg-base-300 rounded shadow text-sm'>{getPageTitle(xml, activeDragItem.sectionIndex, activeDragItem.pageIndex)}</div>}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Bottom (fixed) */}
            <div className='p-2 bg-base-100 border-t border-base-300 preview'>
                <button type='button' className='btn btn-primary w-full' onClick={() => dispatch({ type: 'addSection' })}>
                    + Add Section
                </button>
            </div>

            {/* Modals */}
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
