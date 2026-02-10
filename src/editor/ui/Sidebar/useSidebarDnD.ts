import { useRef, useState } from 'react';
import type { DragOverEvent, DragEndEvent, DragStartEvent, DragCancelEvent } from '@dnd-kit/core';

export function useSidebarDnD({ sections, collapsedSections, setCollapsedSections, dispatch }: { sections: any[]; collapsedSections: Record<number, boolean>; setCollapsedSections: React.Dispatch<React.SetStateAction<Record<number, boolean>>>; dispatch: Function }) {
    const expandTimeout = useRef<number | null>(null);
    const [pageDropIndicator, setPageDropIndicator] = useState<{
        sectionIndex: number;
        pageIndex: number;
    } | null>(null);

    const [activeDragItem, setActiveDragItem] = useState<any>(null);


    function handleDragStart(event: DragStartEvent) {
        const active = event.active?.data?.current;
        if (!active) return;

        setActiveDragItem(active);

        if (active.type === 'section') {
            setCollapsedSections(Object.fromEntries(sections.map((_, i) => [i, true])));
        }
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!active || !over) {
            setPageDropIndicator(null);
            return;
        }

        const a = active.data?.current;
        const o = over.data?.current;
        if (!a || !o) {
            setPageDropIndicator(null);
            return;
        }

        if (a.type === 'page' && o.sectionIndex != null && collapsedSections[o.sectionIndex]) {
            if (!expandTimeout.current) {
                expandTimeout.current = window.setTimeout(() => {
                    setCollapsedSections((prev) => ({
                        ...prev,
                        [o.sectionIndex]: false,
                    }));
                    expandTimeout.current = null;
                }, 400);
            }
        }

        if (a.type === 'page' && a.sectionIndex !== o.sectionIndex) {
            if (o.type === 'page') {
                setPageDropIndicator({
                    sectionIndex: o.sectionIndex,
                    pageIndex: o.pageIndex,
                });
                return;
            }

            if (o.type === 'section-drop') {
                setPageDropIndicator({
                    sectionIndex: o.sectionIndex,
                    pageIndex: 0,
                });
                return;
            }
        }

        setPageDropIndicator(null);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setPageDropIndicator(null);
        setActiveDragItem(null);

        if (!over) return;

        const a = active.data.current;
        const o = over.data.current;

        if (!a || !o) return;

        if (a.type === 'section' && o.type === 'section') {
            dispatch({
                type: 'reorderSections',
                payload: {
                    fromIndex: a.sectionIndex,
                    toIndex: o.sectionIndex,
                },
            });
            return;
        }

        if (a.type === 'page' && o.type === 'section-drop') {
            dispatch({
                type: 'movePageBetweenSections',
                payload: {
                    fromSectionIndex: a.sectionIndex,
                    fromPageIndex: a.pageIndex,
                    toSectionIndex: o.sectionIndex,
                    toPageIndex: 0,
                },
            });
            return;
        }

        if (a.type === 'page' && o.type === 'page') {
            if (a.sectionIndex === o.sectionIndex) {
                dispatch({
                    type: 'reorderPages',
                    payload: {
                        sectionIndex: a.sectionIndex,
                        fromIndex: a.pageIndex,
                        toIndex: o.pageIndex,
                    },
                });
            } else {
                dispatch({
                    type: 'movePageBetweenSections',
                    payload: {
                        fromSectionIndex: a.sectionIndex,
                        fromPageIndex: a.pageIndex,
                        toSectionIndex: o.sectionIndex,
                        toPageIndex: o.pageIndex,
                    },
                });
            }
        }
    }

    function handleDragCancel(_: DragCancelEvent) {
        setPageDropIndicator(null);
        setActiveDragItem(null);
    }

    return {
        activeDragItem,
        pageDropIndicator,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
    };
}
