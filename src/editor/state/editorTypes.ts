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
    | { type: 'updateStorybookAttr'; payload: { field: string; value: string } }
    | { type: 'updateSetupField'; payload: { field: string; value: string } }
    | { type: 'updateAuthorName'; payload: { value: string } }
    | { type: 'updateAuthorBio'; payload: { value: string } }
    | { type: 'addSection' }
    | { type: 'removeSection'; payload: { index: number } }
    | { type: 'renameSection'; payload: { index: number; title: string } }
    | { type: 'addPage'; payload: { sectionIndex: number; pageType: string } }
    | { type: 'removePage'; payload: { sectionIndex: number; pageIndex: number } }
    | { type: 'renamePage'; payload: { sectionIndex: number; pageIndex: number; title: string } }
    | { type: 'moveSectionUp'; payload: { index: number } }
    | { type: 'moveSectionDown'; payload: { index: number } }
    | { type: 'movePageUp'; payload: { sectionIndex: number; pageIndex: number }; }
    | { type: 'movePageDown'; payload: { sectionIndex: number; pageIndex: number }; }
    | { type: 'markDirty' }
    | { type: 'clearDirty' };
