export function getSectionTitle(xml: any, index: number) {
    const section = xml?.storybook.section[index];
    return section?.$?.title || `Section ${index + 1}`;
}

export function getPageTitle(xml: any, sectionIndex: number, pageIndex: number) {
    const section = xml?.storybook.section[sectionIndex];
    const pages = Array.isArray(section?.page) ? section.page : section?.page ? [section.page] : [];

    const page = pages[pageIndex];
    return page?.$?.title || `Page ${pageIndex + 1}`;
}
