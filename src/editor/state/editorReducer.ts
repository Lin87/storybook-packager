import type { EditorState, EditorAction } from './editorTypes';

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

            const sb = state.xml.storybook;
            const prevAttrs = sb.$ ?? {};

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        $: {
                            ...prevAttrs,
                            [action.payload.field]: action.payload.value,
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'updateSetupField': {
            if (!state.xml) return state;

            const sb = state.xml.storybook;
            const setup = sb.setup;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        setup: {
                            ...setup,
                            [action.payload.field]: action.payload.value,
                        } as any,
                    },
                },
                dirty: true,
            };
        }

        case 'updateAuthorName': {
            if (!state.xml) return state;

            const sb = state.xml.storybook;
            const setup = sb.setup;
            const author = setup.author;

            // If author or author.$ is missing, create it
            const nextAuthor = {
                ...(author ?? { _: '' }),
                $: {
                    ...(author && author.$ ? author.$ : {}),
                    name: action.payload.value,
                },
            };

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        setup: {
                            ...setup,
                            author: nextAuthor,
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'updateAuthorBio': {
            if (!state.xml) return state;

            const sb = state.xml.storybook;
            const setup = sb.setup;
            const author = setup.author;

            const nextAuthor = {
                ...(author ?? { $: { name: '' } }),
                _: action.payload.value,
            };

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        setup: {
                            ...setup,
                            author: nextAuthor,
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'addSection': {
            if (!state.xml) return state;

            const sb = state.xml.storybook;

            const currentSectionsRaw = sb.section as any;
            const currentSections = Array.isArray(currentSectionsRaw) ? currentSectionsRaw : currentSectionsRaw ? [currentSectionsRaw] : [];

            const newSection = {
                $: { title: `New Section ${currentSections.length + 1}` },
                page: [],
            };

            const nextSections = [...currentSections, newSection];
            const newSectionIndex = nextSections.length - 1;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections, // always array going forward
                    },
                },
                selectedSectionIndex: newSectionIndex,
                selectedPageIndex: null,
                dirty: true,
            };
        }

        case 'removeSection': {
            if (!state.xml) return state;

            const { index } = action.payload;
            const sb = state.xml.storybook;

            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (index < 0 || index >= sections.length) return state;
            if (sections.length === 1) return state;

            const current = sections[index];
            const currentPages = Array.isArray(current.page) ? current.page : current.page ? [current.page] : [];

            const targetIndex = index === 0 ? 1 : index - 1;
            const target = sections[targetIndex];

            const targetPages = Array.isArray(target.page) ? target.page : target.page ? [target.page] : [];

            const nextTarget = {
                ...target,
                page: [...targetPages, ...currentPages],
            };

            const nextSections = sections.map((s, i) => (i === targetIndex ? nextTarget : s));
            nextSections.splice(index, 1);

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                selectedSectionIndex: null,
                selectedPageIndex: null,
                dirty: true,
            };
        }

        case 'renameSection': {
            if (!state.xml) return state;

            const sb = state.xml.storybook;
            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            const idx = action.payload.index;
            if (idx < 0 || idx >= sections.length) return state;

            const section = sections[idx];
            const nextSection = {
                ...section,
                $: {
                    ...(section.$ ?? {}),
                    title: action.payload.title,
                },
            };

            const nextSections = sections.map((s, i) => (i === idx ? nextSection : s));

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                dirty: true,
            };
        }

        case 'addPage': {
            if (!state.xml) return state;

            const { sectionIndex, pageType } = action.payload;
            const sb = state.xml.storybook;

            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];
            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

            const newPage = {
                $: { type: pageType, title: 'New Page' },
            };

            const nextPages = [...pages, newPage];
            const nextSection = { ...section, page: nextPages };
            const nextSections = sections.map((s, i) => (i === sectionIndex ? nextSection : s));

            const newPageIndex = nextPages.length - 1;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                selectedSectionIndex: sectionIndex,
                selectedPageIndex: newPageIndex,
                dirty: true,
            };
        }

        case 'removePage': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex } = action.payload;
            const sb = state.xml.storybook;

            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];
            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

            if (pageIndex < 0 || pageIndex >= pages.length) return state;

            const nextPages = pages.filter((_: any, i: number) => i !== pageIndex);

            const nextSection = {
                ...section,
                page: nextPages,
            };

            const nextSections = sections.map((s, i) => (i === sectionIndex ? nextSection : s));

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                selectedPageIndex: null,
                dirty: true,
            };
        }

        case 'renamePage': {
            if (!state.xml) return state;

            const { sectionIndex, pageIndex, title } = action.payload;
            const sb = state.xml.storybook;

            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];
            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

            if (pageIndex < 0 || pageIndex >= pages.length) return state;

            const page = pages[pageIndex];
            const nextPage = {
                ...page,
                $: {
                    ...(page.$ ?? {}),
                    title,
                },
            };

            const nextPages = pages.map((p: any, i: number) => (i === pageIndex ? nextPage : p));
            const nextSection = { ...section, page: nextPages };
            const nextSections = sections.map((s, i) => (i === sectionIndex ? nextSection : s));

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                dirty: true,
            };
        }

        case 'reorderSections': {
            if (!state.xml) return state;

            const { fromIndex, toIndex } = action.payload;
            if (fromIndex === toIndex) return state;

            const sb = state.xml.storybook;
            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (fromIndex < 0 || fromIndex >= sections.length || toIndex < 0 || toIndex >= sections.length) return state;

            const reordered = arrayMove(sections, fromIndex, toIndex);

            const nextSelectedSection = state.selectedSectionIndex === null ? null : state.selectedSectionIndex === fromIndex ? toIndex : state.selectedSectionIndex;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: reordered,
                    },
                },
                selectedSectionIndex: nextSelectedSection,
                dirty: true,
            };
        }

        case 'reorderPages': {
            if (!state.xml) return state;

            const { sectionIndex, fromIndex, toIndex } = action.payload;
            if (fromIndex === toIndex) return state;

            const sb = state.xml.storybook;
            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];

            const pages = Array.isArray(section.page) ? section.page : section.page ? [section.page] : [];

            if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return state;

            const nextPages = arrayMove(pages, fromIndex, toIndex);
            const nextSection = { ...section, page: nextPages };
            const nextSections = sections.map((s, i) => (i === sectionIndex ? nextSection : s));

            const nextSelectedPage = state.selectedPageIndex === null ? null : state.selectedPageIndex === fromIndex ? toIndex : state.selectedPageIndex;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                selectedPageIndex: nextSelectedPage,
                dirty: true,
            };
        }

        case 'movePageBetweenSections': {
            if (!state.xml) return state;

            const { fromSectionIndex, fromPageIndex, toSectionIndex, toPageIndex } = action.payload;

            const sb = state.xml.storybook;
            const raw = sb.section as any;
            const sections = Array.isArray(raw) ? raw : raw ? [raw] : [];

            if (fromSectionIndex < 0 || fromSectionIndex >= sections.length || toSectionIndex < 0 || toSectionIndex >= sections.length) return state;

            const fromSection = sections[fromSectionIndex];
            const toSection = sections[toSectionIndex];

            const fromPages = Array.isArray(fromSection.page) ? fromSection.page : fromSection.page ? [fromSection.page] : [];

            const toPages = Array.isArray(toSection.page) ? toSection.page : toSection.page ? [toSection.page] : [];

            if (fromPageIndex < 0 || fromPageIndex >= fromPages.length) return state;

            // Clamp insertion index (so dropping past end inserts at end)
            const safeToIndex = Math.max(0, Math.min(toPageIndex, toPages.length));

            const movedPage = fromPages[fromPageIndex];

            // Build next arrays immutably
            const nextFromPages = fromPages.filter((_: any, i: number) => i !== fromPageIndex);
            const nextToPages = [...toPages.slice(0, safeToIndex), movedPage, ...toPages.slice(safeToIndex)];

            const nextSections = sections.map((s, i) => {
                if (i === fromSectionIndex) return { ...fromSection, page: nextFromPages };
                if (i === toSectionIndex) return { ...toSection, page: nextToPages };
                return s;
            });

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...sb,
                        section: nextSections,
                    },
                },
                selectedSectionIndex: toSectionIndex,
                selectedPageIndex: safeToIndex,
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
