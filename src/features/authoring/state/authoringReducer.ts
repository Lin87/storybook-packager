import { convertPageType, convertQuizSubtype, createDefaultPage } from '@/features/authoring/model/pageModel';
import type { Page, Section } from '@/types/sbplus';
import type { AuthoringAction, AuthoringState } from './authoringTypes';

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function getSections(state: AuthoringState): Section[] {
    return state.xml ? asArray(state.xml.storybook.section) : [];
}

function updateSections(state: AuthoringState, sections: Section[]): AuthoringState {
    if (!state.xml) return state;

    return {
        ...state,
        xml: {
            ...state.xml,
            storybook: {
                ...state.xml.storybook,
                section: sections,
            },
        },
        dirty: true,
    };
}

function updatePageAt(state: AuthoringState, sectionIndex: number, pageIndex: number, updater: (page: Page) => Page): AuthoringState {
    const sections = getSections(state);
    if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

    const section = sections[sectionIndex];
    const pages = asArray(section.page);
    if (pageIndex < 0 || pageIndex >= pages.length) return state;

    const nextPages = pages.map((page, index) => (index === pageIndex ? updater(page) : page));
    const nextSections = sections.map((entry, index) => (index === sectionIndex ? { ...section, page: nextPages } : entry));

    return updateSections(state, nextSections);
}

export const initialAuthoringState: AuthoringState = {
    presentationPath: '',
    xml: null,
    selectedSectionIndex: null,
    selectedPageIndex: null,
    dirty: false,
};

export function authoringReducer(state: AuthoringState, action: AuthoringAction): AuthoringState {
    switch (action.type) {
        case 'loadXml':
            return {
                ...state,
                presentationPath: action.payload.presentationPath,
                xml: action.payload.xml,
                selectedSectionIndex: null,
                selectedPageIndex: null,
                dirty: false,
            };

        case 'setPresentationPath':
            return {
                ...state,
                presentationPath: action.payload.presentationPath,
            };

        case 'selectSetup':
            return {
                ...state,
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

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        $: {
                            ...(state.xml.storybook.$ ?? {}),
                            [action.payload.field]: action.payload.value,
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'updateSetupAttr': {
            if (!state.xml) return state;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        setup: {
                            ...state.xml.storybook.setup,
                            $: {
                                ...(state.xml.storybook.setup.$ ?? {}),
                                [action.payload.field]: action.payload.value,
                            },
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'updateSetupField': {
            if (!state.xml) return state;

            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        setup: {
                            ...state.xml.storybook.setup,
                            [action.payload.field]: action.payload.value,
                        } as typeof state.xml.storybook.setup,
                    },
                },
                dirty: true,
            };
        }

        case 'updateAuthorName': {
            if (!state.xml) return state;

            const author = state.xml.storybook.setup.author;
            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        setup: {
                            ...state.xml.storybook.setup,
                            author: {
                                ...(author ?? { _: '' }),
                                $: {
                                    ...(author?.$ ?? {}),
                                    name: action.payload.value,
                                },
                            },
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'updateAuthorBio': {
            if (!state.xml) return state;

            const author = state.xml.storybook.setup.author;
            return {
                ...state,
                xml: {
                    ...state.xml,
                    storybook: {
                        ...state.xml.storybook,
                        setup: {
                            ...state.xml.storybook.setup,
                            author: {
                                ...(author ?? { $: { name: '' } }),
                                _: action.payload.value,
                            },
                        },
                    },
                },
                dirty: true,
            };
        }

        case 'addSection': {
            if (!state.xml) return state;

            const sections = getSections(state);
            const nextSections = [
                ...sections,
                {
                    $: { title: `New Section ${sections.length + 1}` },
                    page: [],
                },
            ];

            return {
                ...updateSections(state, nextSections),
                selectedSectionIndex: nextSections.length - 1,
                selectedPageIndex: null,
            };
        }

        case 'removeSection': {
            const sections = getSections(state);
            const index = action.payload.index;

            if (index < 0 || index >= sections.length || sections.length === 1) return state;

            const current = sections[index];
            const targetIndex = index === 0 ? 1 : index - 1;
            const target = sections[targetIndex];

            const nextTarget = {
                ...target,
                page: [...asArray(target.page), ...asArray(current.page)],
            };

            const nextSections = sections.map((section, sectionIndex) => (sectionIndex === targetIndex ? nextTarget : section)).filter((_, sectionIndex) => sectionIndex !== index);

            return {
                ...updateSections(state, nextSections),
                selectedSectionIndex: null,
                selectedPageIndex: null,
            };
        }

        case 'renameSection': {
            const sections = getSections(state);
            const idx = action.payload.index;
            if (idx < 0 || idx >= sections.length) return state;

            const nextSections = sections.map((section, index) =>
                index === idx
                    ? {
                        ...section,
                        $: {
                            ...(section.$ ?? {}),
                            title: action.payload.title,
                        },
                    }
                    : section
            );

            return updateSections(state, nextSections);
        }

        case 'addPage': {
            const sections = getSections(state);
            const { sectionIndex, pageType } = action.payload;
            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];
            const nextPages = [...asArray(section.page), createDefaultPage(pageType as Parameters<typeof createDefaultPage>[0])];
            const nextSections = sections.map((entry, index) => (index === sectionIndex ? { ...section, page: nextPages } : entry));

            return {
                ...updateSections(state, nextSections),
                selectedSectionIndex: sectionIndex,
                selectedPageIndex: nextPages.length - 1,
            };
        }

        case 'removePage': {
            const sections = getSections(state);
            const { sectionIndex, pageIndex } = action.payload;
            if (sectionIndex < 0 || sectionIndex >= sections.length) return state;

            const section = sections[sectionIndex];
            const pages = asArray(section.page);
            if (pageIndex < 0 || pageIndex >= pages.length) return state;

            const nextSections = sections.map((entry, index) =>
                index === sectionIndex
                    ? {
                        ...section,
                        page: pages.filter((_, currentIndex) => currentIndex !== pageIndex),
                    }
                    : entry
            );

            return {
                ...updateSections(state, nextSections),
                selectedPageIndex: null,
            };
        }

        case 'renamePage':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, (page) => ({
                ...page,
                $: {
                    ...(page.$ ?? {}),
                    title: action.payload.title,
                },
            }));

        case 'replacePage':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, () => action.payload.page);

        case 'updatePageAttr':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, (page) => {
                const attrs = { ...(page.$ ?? {}) };
                if (action.payload.value === undefined) {
                    delete attrs[action.payload.field];
                } else {
                    attrs[action.payload.field] = action.payload.value;
                }

                return {
                    ...page,
                    $: attrs,
                };
            });

        case 'updatePageField':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, (page) => {
                const nextPage: Page = { ...page };
                if (action.payload.value === undefined) {
                    delete nextPage[action.payload.field];
                } else {
                    nextPage[action.payload.field] = action.payload.value;
                }
                return nextPage;
            });

        case 'changePageType':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, (page) => convertPageType(page, action.payload.pageType));

        case 'changeQuizSubtype':
            return updatePageAt(state, action.payload.sectionIndex, action.payload.pageIndex, (page) => convertQuizSubtype(page, action.payload.quizSubtype));

        case 'reorderSections': {
            const { fromIndex, toIndex } = action.payload;
            const sections = getSections(state);
            if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= sections.length || toIndex < 0 || toIndex >= sections.length) return state;

            return {
                ...updateSections(state, arrayMove(sections, fromIndex, toIndex)),
                selectedSectionIndex:
                    state.selectedSectionIndex === null ? null : state.selectedSectionIndex === fromIndex ? toIndex : state.selectedSectionIndex,
            };
        }

        case 'reorderPages': {
            const { sectionIndex, fromIndex, toIndex } = action.payload;
            const sections = getSections(state);
            if (sectionIndex < 0 || sectionIndex >= sections.length || fromIndex === toIndex) return state;

            const section = sections[sectionIndex];
            const pages = asArray(section.page);
            if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) return state;

            const nextSections = sections.map((entry, index) =>
                index === sectionIndex
                    ? {
                        ...section,
                        page: arrayMove(pages, fromIndex, toIndex),
                    }
                    : entry
            );

            return {
                ...updateSections(state, nextSections),
                selectedPageIndex:
                    state.selectedPageIndex === null ? null : state.selectedPageIndex === fromIndex ? toIndex : state.selectedPageIndex,
            };
        }

        case 'movePageBetweenSections': {
            const { fromSectionIndex, fromPageIndex, toSectionIndex, toPageIndex } = action.payload;
            const sections = getSections(state);
            if (
                fromSectionIndex < 0 ||
                fromSectionIndex >= sections.length ||
                toSectionIndex < 0 ||
                toSectionIndex >= sections.length
            ) {
                return state;
            }

            const fromSection = sections[fromSectionIndex];
            const toSection = sections[toSectionIndex];
            const fromPages = asArray(fromSection.page);
            const toPages = asArray(toSection.page);
            if (fromPageIndex < 0 || fromPageIndex >= fromPages.length) return state;

            const safeToIndex = Math.max(0, Math.min(toPageIndex, toPages.length));
            const movedPage = fromPages[fromPageIndex];

            const nextSections = sections.map((section, index) => {
                if (index === fromSectionIndex) {
                    return {
                        ...fromSection,
                        page: fromPages.filter((_, pageIndex) => pageIndex !== fromPageIndex),
                    };
                }

                if (index === toSectionIndex) {
                    return {
                        ...toSection,
                        page: [...toPages.slice(0, safeToIndex), movedPage, ...toPages.slice(safeToIndex)],
                    };
                }

                return section;
            });

            return {
                ...updateSections(state, nextSections),
                selectedSectionIndex: toSectionIndex,
                selectedPageIndex: safeToIndex,
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
