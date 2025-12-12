import type { EditorState, EditorAction } from './editorTypes';

function ensurePageArray(section: any): any[] {
    if (!section.page) return [];
    return Array.isArray(section.page) ? section.page : [section.page];
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

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

        case 'reorderSections': {
            if (!state.xml) return state;

            const { fromIndex, toIndex } = action.payload;
            if (fromIndex === toIndex) return state;

            const sections = [...state.xml.storybook.section];
            const reordered = arrayMove(sections, fromIndex, toIndex);

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        section: reordered,
                    },
                },
                selectedSectionIndex: state.selectedSectionIndex === fromIndex ? toIndex : state.selectedSectionIndex,
                dirty: true,
            };
        }

        case 'reorderPages': {
            if (!state.xml) return state;

            const { sectionIndex, fromIndex, toIndex } = action.payload;
            if (fromIndex === toIndex) return state;

            const sections = [...state.xml.storybook.section];
            const section = { ...sections[sectionIndex] };
            const pages = [...section.page];

            section.page = arrayMove(pages, fromIndex, toIndex);
            sections[sectionIndex] = section;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        section: sections,
                    },
                },
                selectedPageIndex: state.selectedPageIndex === fromIndex ? toIndex : state.selectedPageIndex,
                dirty: true,
            };
        }

        case 'movePageBetweenSections': {
            if (!state.xml) return state;

            const { fromSectionIndex, fromPageIndex, toSectionIndex, toPageIndex } = action.payload;

            const sections = [...state.xml.storybook.section];

            const fromSection = { ...sections[fromSectionIndex] };
            const toSection = { ...sections[toSectionIndex] };

            const fromPages = [...fromSection.page];
            const toPages = [...toSection.page];

            const [movedPage] = fromPages.splice(fromPageIndex, 1);
            toPages.splice(toPageIndex, 0, movedPage);

            fromSection.page = fromPages;
            toSection.page = toPages;

            sections[fromSectionIndex] = fromSection;
            sections[toSectionIndex] = toSection;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        section: sections,
                    },
                },
                selectedSectionIndex: toSectionIndex,
                selectedPageIndex: toPageIndex,
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
