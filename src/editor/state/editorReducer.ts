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

        case 'addSection': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            const sections = [...newXml.storybook.section];

            sections.push({
                $: { title: `New Section ${sections.length + 1}` },
                page: [],
            });

            newXml.storybook.section = sections;

            return { ...state, xml: newXml, dirty: true };
        }

        case 'removeSection': {
            if (!state.xml) return state;

            const { index } = action.payload;
            const newXml = { ...state.xml };
            const sections = [...newXml.storybook.section];

            // Rule: section index must be valid
            if (index < 0 || index >= sections.length) {
                console.warn('Invalid section index for deletion:', index);
                return state;
            }

            // Cannot delete last remaining section
            if (sections.length === 1) {
                console.warn('Cannot delete the only section.');
                return state;
            }

            const current = sections[index];

            // Defensive: in case current exists but missing page structure
            const currentPages = Array.isArray(current.page) ? current.page : current.page ? [current.page] : [];

            let targetIndex: number;

            // If deleting the first section, merge into next section
            if (index === 0) {
                targetIndex = 1;
            } else {
                targetIndex = index - 1;
            }

            const target = sections[targetIndex];
            const targetPages = Array.isArray(target.page) ? target.page : target.page ? [target.page] : [];

            // Merge pages
            target.page = [...targetPages, ...currentPages];

            // Delete section
            sections.splice(index, 1);

            newXml.storybook.section = sections;

            return {
                ...state,
                xml: newXml,
                selectedSectionIndex: null,
                selectedPageIndex: null,
                dirty: true,
            };
        }

        case 'renameSection': {
            if (!state.xml) return state;

            const newXml = { ...state.xml };
            const section = newXml.storybook.section[action.payload.index];

            if (section.$) {
                section.$.title = action.payload.title;
            }

            return { ...state, xml: newXml, dirty: true };
        }

        case 'addPage': {
            if (!state.xml) return state;
            const { sectionIndex, pageType } = action.payload;

            const newXml = { ...state.xml };
            const section = newXml.storybook.section[sectionIndex];

            const newPage = {
                $: {
                    type: pageType,
                    title: 'New Page',
                },
            };

            section.page = Array.isArray(section.page) ? [...section.page, newPage] : [newPage];

            return {
                ...state,
                xml: newXml,
                dirty: true,
            };
        }

        case 'removePage': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex } = action.payload;
            const newXml = { ...state.xml };

            const section = newXml.storybook.section[sectionIndex];
            const pages = Array.isArray(section.page) ? [...section.page] : [];

            pages.splice(pageIndex, 1);
            section.page = pages;

            return {
                ...state,
                xml: newXml,
                selectedPageIndex: null,
                dirty: true,
            };
        }

        case 'renamePage': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex, title } = action.payload;
            const newXml = { ...state.xml };

            const page = newXml.storybook.section[sectionIndex].page[pageIndex];
            if (page.$) {
                page.$.title = title;
            }

            return { ...state, xml: newXml, dirty: true };
        }

        case 'markDirty':
            return { ...state, dirty: true };

        case 'clearDirty':
            return { ...state, dirty: false };

        default:
            return state;
    }
}
