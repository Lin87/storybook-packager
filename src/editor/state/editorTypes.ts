import type { StorybookXml } from '@/types/sbplus';
import type { Page } from '@/types/sbplus';
import type { QuizSubtype, SupportedPageType } from '@/editor/pageModel';

export interface EditorState {
    presentationPath: string;
    xml: StorybookXml | null;

    selectedSectionIndex: number | null;
    selectedPageIndex: number | null;

    dirty: boolean; // true when unsaved changes exist
}

export type EditorAction =
    | { type: 'loadXml'; payload: { presentationPath: string; xml: StorybookXml } }
    | { type: 'setPresentationPath'; payload: { presentationPath: string } }
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
    | { type: 'replacePage'; payload: { sectionIndex: number; pageIndex: number; page: Page } }
    | { type: 'updatePageAttr'; payload: { sectionIndex: number; pageIndex: number; field: string; value: string | undefined } }
    | { type: 'updatePageField'; payload: { sectionIndex: number; pageIndex: number; field: 'note' | 'description' | 'copyableContent'; value: string | undefined } }
    | { type: 'changePageType'; payload: { sectionIndex: number; pageIndex: number; pageType: SupportedPageType } }
    | { type: 'changeQuizSubtype'; payload: { sectionIndex: number; pageIndex: number; quizSubtype: QuizSubtype } }
    | { type: 'reorderSections'; payload: { fromIndex: number; toIndex: number } }
    | { type: 'reorderPages'; payload: { sectionIndex: number; fromIndex: number; toIndex: number } }
    | { type: 'movePageBetweenSections'; payload: { fromSectionIndex: number; fromPageIndex: number; toSectionIndex: number; toPageIndex: number; } }
    | { type: 'markDirty' }
    | { type: 'clearDirty' };
