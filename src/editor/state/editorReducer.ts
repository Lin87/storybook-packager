import type { EditorState, EditorAction } from './editorTypes';

export const initialEditorState: EditorState = {
    presentationPath: '',
    xml: null,

    selectedSectionIndex: null,
    selectedPageIndex: null,

    dirty: false,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case 'loadXml':
            return {
                ...state,
                presentationPath: action.payload.presentationPath,
                xml: action.payload.xml,
                selectedSectionIndex: null,
                selectedPageIndex: null,
            };

        case 'selectSection':
            return {
                ...state,
                selectedSectionIndex: action.payload.sectionIndex,
                selectedPageIndex: null,
            };

        case 'selectPage':
            return {
                ...state,
                selectedSectionIndex: action.payload.sectionIndex,
                selectedPageIndex: action.payload.pageIndex,
            };

        case 'markDirty':
            return { ...state, dirty: true };

        case 'clearDirty':
            return { ...state, dirty: false };

        default:
            return state;
    }
}
