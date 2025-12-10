import type { StorybookXml } from '@/types/sbplus';

export interface EditorState {
    presentationPath: string;
    xml: StorybookXml | null;

    selectedSectionIndex: number | null;
    selectedPageIndex: number | null;

    dirty: boolean; // true when unsaved changes exist
}

export type EditorAction =
    | { type: 'loadXml'; payload: { presentationPath: string; xml: StorybookXml } }
    | { type: 'selectSection'; payload: { sectionIndex: number } }
    | { type: 'selectPage'; payload: { sectionIndex: number; pageIndex: number } }
    | { type: 'markDirty' }
    | { type: 'clearDirty' };
