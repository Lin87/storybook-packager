'use client';

import { useMemo } from 'react';
import { useEditor } from '@/features/authoring/state/AuthoringProvider';
import type { Page } from '@/types/sbplus';

function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export function usePageEditorState(sectionIndex: number, pageIndex: number) {
    const { state, dispatch } = useEditor();

    const page = useMemo<Page | null>(() => {
        if (!state.xml) return null;
        const section = asArray(state.xml.storybook.section)[sectionIndex];
        return asArray(section?.page)[pageIndex] ?? null;
    }, [pageIndex, sectionIndex, state.xml]);

    return { state, dispatch, page };
}
