import type { Page, QuizAnswer, StorybookXml } from '../types/sbplus';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationLocation {
    sectionIndex?: number;
    pageIndex?: number;
    sectionTitle?: string;
    pageTitle?: string;
}

export interface ValidationItem {
    severity: ValidationSeverity;
    code: string;
    message: string;
    location?: ValidationLocation;
    target?: string;
}

export interface ValidationSummary {
    errors: number;
    warnings: number;
    info: number;
}

export interface ValidationResult {
    items: ValidationItem[];
    summary: ValidationSummary;
}

export interface ValidationFileSystem {
    exists: (relativePath: string) => boolean;
    listFiles?: (relativeDirectory: string) => string[];
}

export interface ValidatePresentationOptions {
    fileSystem?: ValidationFileSystem;
}

type LocalTarget = {
    path: string;
    label: string;
    location?: ValidationLocation;
};

const PAGE_TYPES = ['image', 'image-audio', 'bundle', 'video', 'youtube', 'kaltura', 'brightcove', 'html', 'quiz'] as const;
const QUIZ_SUBTYPES = ['multipleChoiceSingle', 'multipleChoiceMultiple', 'shortAnswer', 'fillInTheBlank'] as const;

const PAGE_TYPES_WITH_REQUIRED_SRC = new Set(['image', 'image-audio', 'bundle', 'video', 'youtube', 'kaltura', 'brightcove', 'html']);
const LOCAL_PAGE_ASSET_TYPES = new Set(['image', 'image-audio']);
const EXTERNAL_PROVIDER_TYPES = new Set(['youtube', 'kaltura', 'brightcove']);

export function validatePresentation(xml: StorybookXml, options: ValidatePresentationOptions = {}): ValidationResult {
    const items: ValidationItem[] = [];
    const targets: LocalTarget[] = [];
    const fileSystem = options.fileSystem;
    const storybookAttrs = xml.storybook.$ ?? {};
    const pageImgFormat = normalizeExtension(storybookAttrs.pageImgFormat, 'jpg');
    const splashImgFormat = normalizeExtension(storybookAttrs.splashImgFormat, 'jpg');

    const addItem = (item: ValidationItem) => items.push(item);
    const requireFile = (path: string, label: string, location?: ValidationLocation) => {
        targets.push({ path, label, location });

        if (fileSystem && !fileSystem.exists(path)) {
            addItem({
                severity: 'error',
                code: 'MISSING_ASSET',
                message: `Missing ${label}: ${path}`,
                location,
                target: path,
            });
        }
    };

    requireFile(`assets/splash.${splashImgFormat}`, 'splash image');

    const sections = asArray(xml.storybook.section);
    sections.forEach((section, sectionIndex) => {
        const pages = asArray(section.page);
        const sectionTitle = text(section.$?.title) || `Section ${sectionIndex + 1}`;

        pages.forEach((page, pageIndex) => {
            const pageType = text(page.$?.type);
            const rawPageTitle = text(page.$?.title);
            const pageTitle = rawPageTitle || `Page ${pageIndex + 1}`;
            const location: ValidationLocation = { sectionIndex, pageIndex, sectionTitle, pageTitle };
            const src = text(page.$?.src);

            validatePageTitle(rawPageTitle, location, addItem);

            if (!isSupportedPageType(pageType)) {
                addItem({
                    severity: 'error',
                    code: 'INVALID_PAGE_TYPE',
                    message: pageType ? `Invalid page type "${pageType}".` : 'Missing page type.',
                    location,
                });
                return;
            }

            if (PAGE_TYPES_WITH_REQUIRED_SRC.has(pageType) && !src) {
                addItem({
                    severity: 'error',
                    code: 'EMPTY_REQUIRED_SRC',
                    message: `${labelForPageType(pageType)} requires a source.`,
                    location,
                });
            }

            if (!src) {
                validateQuiz(page, location, requireFile, addItem);
                return;
            }

            if (LOCAL_PAGE_ASSET_TYPES.has(pageType)) {
                requireFile(`assets/pages/${withExtension(src, pageImgFormat)}`, 'page image', location);
            }

            if (pageType === 'image-audio') {
                requireFile(`assets/audio/${withExtension(src, 'mp3')}`, 'page audio', location);
            }

            if (pageType === 'bundle') {
                validateBundle(page, src, pageImgFormat, location, fileSystem, requireFile, addItem);
            }

            if (pageType === 'video' && !isExternalUrl(src)) {
                requireFile(`assets/video/${withExtension(src, 'mp4')}`, 'video', location);
            }

            if (pageType === 'html' && !isExternalUrl(src)) {
                const flatPath = `assets/html/${withExtension(src, 'html')}`;
                const indexPath = `assets/html/${src}/index.html`;
                targets.push({ path: flatPath, label: 'HTML file', location });

                if (fileSystem && !fileSystem.exists(flatPath) && !fileSystem.exists(indexPath)) {
                    addItem({
                        severity: 'error',
                        code: 'MISSING_HTML',
                        message: `Missing local HTML file: ${flatPath}`,
                        location,
                        target: flatPath,
                    });
                }
            }

            if (pageType === 'html' && page.audio?.$?.src) {
                const audioSrc = text(page.audio.$.src);
                if (audioSrc && !isExternalUrl(audioSrc)) {
                    requireFile(`assets/audio/${withExtension(audioSrc, 'mp3')}`, 'HTML audio', location);
                }
            }

            if (!EXTERNAL_PROVIDER_TYPES.has(pageType)) {
                validateQuiz(page, location, requireFile, addItem);
            }
        });
    });

    addDuplicateTargetWarnings(targets, addItem);

    if (items.length === 0) {
        addItem({
            severity: 'info',
            code: 'VALIDATION_OK',
            message: 'No package issues found.',
        });
    }

    return {
        items,
        summary: {
            errors: items.filter((item) => item.severity === 'error').length,
            warnings: items.filter((item) => item.severity === 'warning').length,
            info: items.filter((item) => item.severity === 'info').length,
        },
    };
}

function validatePageTitle(pageTitle: string, location: ValidationLocation, addItem: (item: ValidationItem) => void) {
    if (!pageTitle) {
        addItem({
            severity: 'warning',
            code: 'MISSING_PAGE_TITLE',
            message: 'Page is missing a title.',
            location,
        });
        return;
    }

    if (pageTitle === 'New Page' || pageTitle === 'New Quiz') {
        addItem({
            severity: 'warning',
            code: 'PLACEHOLDER_PAGE_TITLE',
            message: `Page title still uses the default placeholder "${pageTitle}".`,
            location,
        });
    }
}

function validateBundle(
    page: Page,
    src: string,
    pageImgFormat: string,
    location: ValidationLocation,
    fileSystem: ValidationFileSystem | undefined,
    requireFile: (path: string, label: string, location?: ValidationLocation) => void,
    addItem: (item: ValidationItem) => void,
) {
    requireFile(`assets/pages/${src}-1.${pageImgFormat}`, 'bundle frame 1 image', location);
    asArray(page.frame).forEach((_frame, index) => {
        const frameNumber = index + 2;
        requireFile(`assets/pages/${src}-${frameNumber}.${pageImgFormat}`, `bundle frame ${frameNumber} image`, location);
    });
    requireFile(`assets/audio/${src}-bundled.mp3`, 'bundle audio', location);

    const frameNumbers = getBundleFrameNumbers(src, pageImgFormat, fileSystem);
    if (frameNumbers.length > 1) {
        const max = Math.max(...frameNumbers);
        for (let frameNumber = 1; frameNumber <= max; frameNumber += 1) {
            if (!frameNumbers.includes(frameNumber)) {
                addItem({
                    severity: 'warning',
                    code: 'BUNDLE_FRAME_GAP',
                    message: `Bundle frame numbering skips frame ${frameNumber}.`,
                    location,
                    target: `assets/pages/${src}-${frameNumber}.${pageImgFormat}`,
                });
            }
        }
    }
}

function validateQuiz(
    page: Page,
    location: ValidationLocation,
    requireFile: (path: string, label: string, location?: ValidationLocation) => void,
    addItem: (item: ValidationItem) => void,
) {
    if (text(page.$?.type) !== 'quiz') return;

    const presentSubtypes = QUIZ_SUBTYPES.filter((subtype) => Boolean(page[subtype]));
    if (presentSubtypes.length !== 1) {
        addItem({
            severity: 'error',
            code: 'INVALID_QUIZ_SUBTYPE',
            message: presentSubtypes.length === 0
                ? 'Quiz page is missing a quiz subtype.'
                : `Quiz page has multiple quiz subtypes: ${presentSubtypes.join(', ')}.`,
            location,
        });
        return;
    }

    const questionAttrs = getQuizQuestionAttrs(page, presentSubtypes[0]);
    requireQuizMedia(questionAttrs.image, 'quiz question image', 'assets/images', location, requireFile);
    requireQuizMedia(questionAttrs.audio, 'quiz question audio', 'assets/audio', location, requireFile);

    getQuizAnswers(page, presentSubtypes[0]).forEach((answer, answerIndex) => {
        const answerLocation = { ...location, pageTitle: `${location.pageTitle} answer ${answerIndex + 1}` };
        requireQuizMedia(answer.$?.image, 'quiz answer image', 'assets/images', answerLocation, requireFile);
        requireQuizMedia(answer.$?.audio, 'quiz answer audio', 'assets/audio', answerLocation, requireFile);
    });
}

function requireQuizMedia(
    value: string | undefined,
    label: string,
    directory: string,
    location: ValidationLocation,
    requireFile: (path: string, label: string, location?: ValidationLocation) => void,
) {
    const source = text(value);
    if (!source || isExternalUrl(source)) return;
    requireFile(`${directory}/${source}`, label, location);
}

function addDuplicateTargetWarnings(targets: LocalTarget[], addItem: (item: ValidationItem) => void) {
    const seen = new Map<string, LocalTarget[]>();
    targets.forEach((target) => {
        const normalized = target.path.toLowerCase();
        seen.set(normalized, [...(seen.get(normalized) ?? []), target]);
    });

    for (const [path, matchingTargets] of seen) {
        if (matchingTargets.length < 2) continue;

        const labels = matchingTargets
            .map((target) => target.location?.pageTitle ?? target.label)
            .filter(Boolean)
            .join(', ');

        addItem({
            severity: 'warning',
            code: 'DUPLICATE_LOCAL_TARGET',
            message: `Multiple references target ${matchingTargets[0].path}: ${labels}.`,
            location: matchingTargets[0].location,
            target: matchingTargets[0].path || path,
        });
    }
}

function getBundleFrameNumbers(src: string, pageImgFormat: string, fileSystem: ValidationFileSystem | undefined): number[] {
    if (!fileSystem?.listFiles) return [];

    const escapedSrc = escapeRegExp(src);
    const escapedFormat = escapeRegExp(pageImgFormat);
    const framePattern = new RegExp(`^${escapedSrc}-(\\d+)\\.${escapedFormat}$`, 'i');

    return fileSystem
        .listFiles('assets/pages')
        .map((name) => {
            const match = name.match(framePattern);
            return match ? Number.parseInt(match[1], 10) : 0;
        })
        .filter((number) => number > 0)
        .sort((a, b) => a - b);
}

function getQuizQuestionAttrs(page: Page, subtype: (typeof QUIZ_SUBTYPES)[number]) {
    if (subtype === 'multipleChoiceSingle') return page.multipleChoiceSingle?.question.$ ?? {};
    if (subtype === 'multipleChoiceMultiple') return page.multipleChoiceMultiple?.question.$ ?? {};
    if (subtype === 'shortAnswer') return page.shortAnswer?.$ ?? {};
    return page.fillInTheBlank?.$ ?? {};
}

function getQuizAnswers(page: Page, subtype: (typeof QUIZ_SUBTYPES)[number]): QuizAnswer[] {
    if (subtype === 'multipleChoiceSingle') return asArray(page.multipleChoiceSingle?.choices?.answer);
    if (subtype === 'multipleChoiceMultiple') return asArray(page.multipleChoiceMultiple?.choices?.answer);
    return [];
}

function isSupportedPageType(type: string): type is (typeof PAGE_TYPES)[number] {
    return PAGE_TYPES.includes(type as (typeof PAGE_TYPES)[number]);
}

function normalizeExtension(value: string | undefined, fallback: string) {
    return text(value || fallback).replace(/^\.+/, '').toLowerCase() || fallback;
}

function withExtension(source: string, extension: string) {
    return /\.[a-z0-9]+$/i.test(source) ? source : `${source}.${extension}`;
}

function text(value: string | undefined) {
    return (value ?? '').trim();
}

function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function isExternalUrl(source: string) {
    return /^(https?:)?\/\//i.test(source) || /^data:/i.test(source);
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function labelForPageType(pageType: string) {
    return pageType === 'html' ? 'HTML page' : pageType === 'image-audio' ? 'Image + audio page' : `${pageType} page`;
}
