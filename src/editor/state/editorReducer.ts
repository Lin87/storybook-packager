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

        case 'updateStorybookAttr': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            const attrs = newXml.storybook.$ || {};

            attrs[action.payload.field] = action.payload.value;
            newXml.storybook.$ = attrs;

            return {
                ...state,
                xml: newXml,
                dirty: true,
            };
        }

        case 'updateSetupField': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            (newXml.storybook.setup as any)[action.payload.field] = action.payload.value;

            return {
                ...state,
                xml: newXml,
                dirty: true,
            };
        }

        case 'updateAuthorName': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            const author = newXml.storybook.setup.author;

            if (author && author.$) {
                author.$.name = action.payload.value;
            }

            return {
                ...state,
                xml: newXml,
                dirty: true,
            };
        }

        case 'updateAuthorBio': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            const author = newXml.storybook.setup.author;

            if (author) {
                author._ = action.payload.value;
            }

            return {
                ...state,
                xml: newXml,
                dirty: true,
            };
        }

        case 'markDirty':
            return { ...state, dirty: true };

        case 'clearDirty':
            return { ...state, dirty: false };

        default:
            return state;
    }
}
