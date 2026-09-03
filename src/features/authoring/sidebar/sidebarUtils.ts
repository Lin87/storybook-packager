import type { StorybookXml } from '@/types/sbplus';

function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

export function getSectionTitle(xml: StorybookXml, index: number) {
    const section = asArray(xml.storybook.section)[index];
    return section?.$?.title || `Section ${index + 1}`;
}

export function getPageTitle(xml: StorybookXml, sectionIndex: number, pageIndex: number) {
    const section = asArray(xml.storybook.section)[sectionIndex];
    const pages = asArray(section?.page);

    const page = pages[pageIndex];
    return page?.$?.title || `Page ${pageIndex + 1}`;
}
