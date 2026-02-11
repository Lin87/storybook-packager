import type { ComponentType } from 'react';

export interface PageEditorProps {
    sectionIndex: number;
    pageIndex: number;
}

export interface PageEditorRegistration {
    label: string;
    Editor: ComponentType<PageEditorProps>;
}
