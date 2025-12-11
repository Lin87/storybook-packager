import type { EditorState, EditorAction } from './editorTypes';

function ensurePageArray(section: any): any[] {
    if (!section.page) return [];
    return Array.isArray(section.page) ? section.page : [section.page];
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

        case 'moveSectionUp': {
            if (!state.xml) return state;

            const { index } = action.payload;
            const sections = Array.isArray(state.xml.storybook.section) ? [...state.xml.storybook.section] : [state.xml.storybook.section];

            if (index <= 0 || index >= sections.length) return state;

            // swap
            const tmp = sections[index - 1];
            sections[index - 1] = sections[index];
            sections[index] = tmp;

            const newXml = {
                ...state.xml,
                storybook: {
                    ...state.xml.storybook,
                    section: sections,
                },
            };

            let selectedSectionIndex = state.selectedSectionIndex;
            let selectedPageIndex = state.selectedPageIndex;

            if (selectedSectionIndex === index) {
                selectedSectionIndex = index - 1;
            } else if (selectedSectionIndex === index - 1) {
                selectedSectionIndex = index;
            }

            return {
                ...state,
                xml: newXml,
                selectedSectionIndex,
                selectedPageIndex,
                dirty: true,
            };
        }

        case 'moveSectionDown': {
            if (!state.xml) return state;

            const { index } = action.payload;
            const sections = Array.isArray(state.xml.storybook.section) ? [...state.xml.storybook.section] : [state.xml.storybook.section];

            if (index < 0 || index >= sections.length - 1) return state;

            const tmp = sections[index + 1];
            sections[index + 1] = sections[index];
            sections[index] = tmp;

            const newXml = {
                ...state.xml,
                storybook: {
                    ...state.xml.storybook,
                    section: sections,
                },
            };

            let selectedSectionIndex = state.selectedSectionIndex;
            let selectedPageIndex = state.selectedPageIndex;

            if (selectedSectionIndex === index) {
                selectedSectionIndex = index + 1;
            } else if (selectedSectionIndex === index + 1) {
                selectedSectionIndex = index;
            }

            return {
                ...state,
                xml: newXml,
                selectedSectionIndex,
                selectedPageIndex,
                dirty: true,
            };
        }

        case 'movePageUp': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex } = action.payload;
            const xml = state.xml;

            const sections = Array.isArray(xml.storybook.section) ? [...xml.storybook.section] : [xml.storybook.section];

            if (sectionIndex < 0 || sectionIndex >= sections.length) {
                return state;
            }

            const currentSection = { ...sections[sectionIndex] };
            const currentPages = ensurePageArray(currentSection);

            if (currentPages.length === 0) return state;
            if (pageIndex < 0 || pageIndex >= currentPages.length) return state;

            // For tracking the same logical page after reorder
            const prevXml = xml;
            let selectedSectionIndex = state.selectedSectionIndex;
            let selectedPageIndex = state.selectedPageIndex;
            let selectedPageRef: any = null;

            if (selectedSectionIndex !== null && selectedPageIndex !== null && prevXml.storybook.section[selectedSectionIndex]) {
                const prevSection = prevXml.storybook.section[selectedSectionIndex];
                const prevPages = ensurePageArray(prevSection);
                selectedPageRef = prevPages[selectedPageIndex] ?? null;
            }

            if (pageIndex > 0) {
                // Move up within same section
                const pagesCopy = [...currentPages];
                const tmp = pagesCopy[pageIndex - 1];
                pagesCopy[pageIndex - 1] = pagesCopy[pageIndex];
                pagesCopy[pageIndex] = tmp;

                currentSection.page = pagesCopy;
                sections[sectionIndex] = currentSection;
            } else {
                // pageIndex === 0, try to move to previous section
                if (sectionIndex === 0) {
                    // can't move across
                    return state;
                }

                const prevSection = { ...sections[sectionIndex - 1] };
                const prevPages = ensurePageArray(prevSection);
                const pagesCopy = [...currentPages];

                const [pageToMove] = pagesCopy.splice(0, 1);
                if (!pageToMove) return state;

                prevSection.page = [...prevPages, pageToMove];
                currentSection.page = pagesCopy;

                sections[sectionIndex - 1] = prevSection;
                sections[sectionIndex] = currentSection;
            }

            const newXml = {
                ...xml,
                storybook: {
                    ...xml.storybook,
                    section: sections,
                },
            };

            // Re-locate selected page (by object identity) if any
            if (selectedPageRef) {
                let foundSectionIndex: number | null = null;
                let foundPageIndex: number | null = null;

                const newSections = Array.isArray(newXml.storybook.section) ? newXml.storybook.section : [newXml.storybook.section];

                outer: for (let s = 0; s < newSections.length; s++) {
                    const sec = newSections[s];
                    const pArray = ensurePageArray(sec);
                    for (let p = 0; p < pArray.length; p++) {
                        if (pArray[p] === selectedPageRef) {
                            foundSectionIndex = s;
                            foundPageIndex = p;
                            break outer;
                        }
                    }
                }

                selectedSectionIndex = foundSectionIndex;
                selectedPageIndex = foundPageIndex;
            }

            return {
                ...state,
                xml: newXml,
                selectedSectionIndex,
                selectedPageIndex,
                dirty: true,
            };
        }

        case 'movePageDown': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex } = action.payload;
            const xml = state.xml;

            const sections = Array.isArray(xml.storybook.section) ? [...xml.storybook.section] : [xml.storybook.section];

            if (sectionIndex < 0 || sectionIndex >= sections.length) {
                return state;
            }

            const currentSection = { ...sections[sectionIndex] };
            const currentPages = ensurePageArray(currentSection);

            if (currentPages.length === 0) return state;
            if (pageIndex < 0 || pageIndex >= currentPages.length) return state;

            const lastIndex = currentPages.length - 1;

            const prevXml = xml;
            let selectedSectionIndex = state.selectedSectionIndex;
            let selectedPageIndex = state.selectedPageIndex;
            let selectedPageRef: any = null;

            if (selectedSectionIndex !== null && selectedPageIndex !== null && prevXml.storybook.section[selectedSectionIndex]) {
                const prevSection = prevXml.storybook.section[selectedSectionIndex];
                const prevPages = ensurePageArray(prevSection);
                selectedPageRef = prevPages[selectedPageIndex] ?? null;
            }

            if (pageIndex < lastIndex) {
                // Move within same section
                const pagesCopy = [...currentPages];
                const tmp = pagesCopy[pageIndex + 1];
                pagesCopy[pageIndex + 1] = pagesCopy[pageIndex];
                pagesCopy[pageIndex] = tmp;

                currentSection.page = pagesCopy;
                sections[sectionIndex] = currentSection;
            } else {
                // pageIndex === lastIndex, try to move to next section
                if (sectionIndex === sections.length - 1) {
                    // can't move down across last section
                    return state;
                }

                const nextSection = { ...sections[sectionIndex + 1] };
                const nextPages = ensurePageArray(nextSection);
                const pagesCopy = [...currentPages];

                const [pageToMove] = pagesCopy.splice(pageIndex, 1);
                if (!pageToMove) return state;

                nextSection.page = [pageToMove, ...nextPages];
                currentSection.page = pagesCopy;

                sections[sectionIndex] = currentSection;
                sections[sectionIndex + 1] = nextSection;
            }

            const newXml = {
                ...xml,
                storybook: {
                    ...xml.storybook,
                    section: sections,
                },
            };

            // Re-locate selected page
            if (selectedPageRef) {
                let foundSectionIndex: number | null = null;
                let foundPageIndex: number | null = null;

                const newSections = Array.isArray(newXml.storybook.section) ? newXml.storybook.section : [newXml.storybook.section];

                outer: for (let s = 0; s < newSections.length; s++) {
                    const sec = newSections[s];
                    const pArray = ensurePageArray(sec);
                    for (let p = 0; p < pArray.length; p++) {
                        if (pArray[p] === selectedPageRef) {
                            foundSectionIndex = s;
                            foundPageIndex = p;
                            break outer;
                        }
                    }
                }

                selectedSectionIndex = foundSectionIndex;
                selectedPageIndex = foundPageIndex;
            }

            return {
                ...state,
                xml: newXml,
                selectedSectionIndex,
                selectedPageIndex,
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
