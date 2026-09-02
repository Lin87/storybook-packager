import { useRef, useState, useEffect } from 'react';
import type { DragOverEvent, DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Section } from '@/types/sbplus';
import type { AuthoringAction } from '@/features/authoring/state/authoringTypes';

export type SectionDragItem = { type: 'section'; sectionIndex: number };
export type PageDragItem = { type: 'page'; sectionIndex: number; pageIndex: number };
export type SectionDropItem = { type: 'section-drop'; sectionIndex: number };
export type SidebarDragItem = SectionDragItem | PageDragItem;
type SidebarDropTarget = SidebarDragItem | SectionDropItem;

interface UseSidebarDnDProps {
    sections: Section[];
    collapsedSections: Record<number, boolean>;
    setCollapsedSections: Dispatch<SetStateAction<Record<number, boolean>>>;
    dispatch: Dispatch<AuthoringAction>;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function useSidebarDnD({ sections, collapsedSections, setCollapsedSections, dispatch, scrollContainerRef }: UseSidebarDnDProps) {
    const expandTimeout = useRef<number | null>(null);

    const [pageDropIndicator, setPageDropIndicator] = useState<{
        sectionIndex: number;
        pageIndex: number;
    } | null>(null);

    const [activeDragItem, setActiveDragItem] = useState<SidebarDragItem | null>(null);

    const autoScrollRafRef = useRef<number | null>(null);
    const autoScrollVelocityRef = useRef(0);

    const AUTO_SCROLL_EDGE_PX = 56;
    const AUTO_SCROLL_MAX_PX = 18;

    const stopAutoScroll = () => {
        autoScrollVelocityRef.current = 0;
        if (autoScrollRafRef.current !== null) {
            cancelAnimationFrame(autoScrollRafRef.current);
            autoScrollRafRef.current = null;
        }
    };

    const startAutoScroll = () => {
        if (autoScrollRafRef.current !== null) return;

        const tick = () => {
            const el = scrollContainerRef.current;
            if (!el) return stopAutoScroll();

            const v = autoScrollVelocityRef.current;
            if (v === 0) return stopAutoScroll();

            el.scrollTop += v;
            autoScrollRafRef.current = requestAnimationFrame(tick);
        };

        autoScrollRafRef.current = requestAnimationFrame(tick);
    };

    const updateAutoScrollFromClientY = (clientY: number) => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();

        // Only autoscroll while the dragged item is within the scroll region vertically
        if (clientY < rect.top || clientY > rect.bottom) {
            stopAutoScroll();
            return;
        }

        const distTop = clientY - rect.top;
        const distBottom = rect.bottom - clientY;

        let v = 0;

        if (distTop < AUTO_SCROLL_EDGE_PX) {
            const t = 1 - distTop / AUTO_SCROLL_EDGE_PX;
            v = -Math.ceil(t * AUTO_SCROLL_MAX_PX);
        } else if (distBottom < AUTO_SCROLL_EDGE_PX) {
            const t = 1 - distBottom / AUTO_SCROLL_EDGE_PX;
            v = Math.ceil(t * AUTO_SCROLL_MAX_PX);
        }

        autoScrollVelocityRef.current = v;

        if (v !== 0) startAutoScroll();
        else stopAutoScroll();
    };

    function handleDragStart(event: DragStartEvent) {
        const active = event.active?.data?.current as SidebarDragItem | undefined;
        if (!active) return;

        setActiveDragItem(active);

        if (active.type === 'section') {
            setCollapsedSections(Object.fromEntries(sections.map((_, i) => [i, true])));
        }
    }

    function handleDragMove(event: DragMoveEvent) {
        // IMPORTANT: activatorEvent is the original pointer-down event (stale).
        // Use the actively translated rect instead (updates each frame).
        const translated = event.active.rect.current.translated;
        const initial = event.active.rect.current.initial;

        // translated/top are viewport coords when available
        const rect = translated ?? initial;
        if (!rect) return;

        const clientY = rect.top + rect.height / 2;
        updateAutoScrollFromClientY(clientY);
    }

    useEffect(() => {
        return () => stopAutoScroll();
    }, []);

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!active || !over) {
            setPageDropIndicator(null);
            return;
        }

        const a = active.data?.current as SidebarDragItem | undefined;
        const o = over.data?.current as SidebarDropTarget | undefined;
        if (!a || !o) {
            setPageDropIndicator(null);
            return;
        }

        if (a.type === 'page' && o.sectionIndex != null && collapsedSections[o.sectionIndex]) {
            if (!expandTimeout.current) {
                expandTimeout.current = window.setTimeout(() => {
                    setCollapsedSections((prev) => ({ ...prev, [o.sectionIndex]: false }));
                    expandTimeout.current = null;
                }, 400);
            }
        }

        if (a.type === 'page' && a.sectionIndex !== o.sectionIndex) {
            if (o.type === 'page') {
                setPageDropIndicator({ sectionIndex: o.sectionIndex, pageIndex: o.pageIndex });
                return;
            }
            if (o.type === 'section-drop') {
                setPageDropIndicator({ sectionIndex: o.sectionIndex, pageIndex: 0 });
                return;
            }
        }

        setPageDropIndicator(null);
    }

    function handleDragEnd(event: DragEndEvent) {
        stopAutoScroll();

        const { active, over } = event;
        setPageDropIndicator(null);
        setActiveDragItem(null);

        if (!over) return;

        const a = active.data.current as SidebarDragItem | undefined;
        const o = over.data.current as SidebarDropTarget | undefined;
        if (!a || !o) return;

        // keep your existing reorder/move logic...
        if (a.type === 'section' && o.type === 'section') {
            dispatch({ type: 'reorderSections', payload: { fromIndex: a.sectionIndex, toIndex: o.sectionIndex } });
            return;
        }

        if (a.type === 'page' && o.type === 'section-drop') {
            dispatch({
                type: 'movePageBetweenSections',
                payload: { fromSectionIndex: a.sectionIndex, fromPageIndex: a.pageIndex, toSectionIndex: o.sectionIndex, toPageIndex: 0 },
            });
            return;
        }

        if (a.type === 'page' && o.type === 'page') {
            if (a.sectionIndex === o.sectionIndex) {
                dispatch({ type: 'reorderPages', payload: { sectionIndex: a.sectionIndex, fromIndex: a.pageIndex, toIndex: o.pageIndex } });
            } else {
                dispatch({
                    type: 'movePageBetweenSections',
                    payload: { fromSectionIndex: a.sectionIndex, fromPageIndex: a.pageIndex, toSectionIndex: o.sectionIndex, toPageIndex: o.pageIndex },
                });
            }
        }
    }

    function handleDragCancel() {
        stopAutoScroll();
        setPageDropIndicator(null);
        setActiveDragItem(null);
    }

    return {
        activeDragItem,
        pageDropIndicator,
        handleDragStart,
        handleDragMove,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
    };
}
