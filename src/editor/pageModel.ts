import type {
    FillInTheBlank,
    Frame,
    Marker,
    Page,
    QuizAnswer,
    QuizMultiple,
    QuizSingle,
    Segment,
    ShortAnswer,
    XmlAttributes,
} from '@/types/sbplus';

export const PAGE_TYPES = ['image', 'image-audio', 'bundle', 'video', 'youtube', 'kaltura', 'brightcove', 'html', 'quiz'] as const;
export type SupportedPageType = (typeof PAGE_TYPES)[number];

export const QUIZ_SUBTYPES = ['multipleChoiceSingle', 'multipleChoiceMultiple', 'shortAnswer', 'fillInTheBlank'] as const;
export type QuizSubtype = (typeof QUIZ_SUBTYPES)[number];

export interface PageCapabilities {
    supportsSrc: boolean;
    supportsTransition: boolean;
    supportsNote: boolean;
    supportsDescription: boolean;
    supportsCopyableContent: boolean;
    supportsWidget: boolean;
    supportsMarkers: boolean;
    supportsFrames: boolean;
    supportsPreventAutoplay: boolean;
    supportsAllowFullscreen: boolean;
    supportsUseDefaultPlayer: boolean;
    supportsEmbed: boolean;
    supportsFullHeight: boolean;
    supportsAudio: boolean;
    isQuiz: boolean;
}

const NON_QUIZ_CAPS: Omit<PageCapabilities, 'supportsDescription' | 'supportsMarkers' | 'supportsFrames' | 'supportsPreventAutoplay' | 'supportsAllowFullscreen' | 'supportsUseDefaultPlayer' | 'supportsEmbed' | 'supportsFullHeight' | 'supportsAudio' | 'isQuiz'> = {
    supportsSrc: true,
    supportsTransition: true,
    supportsNote: true,
    supportsCopyableContent: true,
    supportsWidget: true,
};

export const PAGE_TYPE_LABELS: Record<SupportedPageType, string> = {
    image: 'Image Page',
    'image-audio': 'Image + Audio Page',
    bundle: 'Bundle Page',
    video: 'Video Page',
    youtube: 'YouTube Page',
    kaltura: 'Kaltura Page',
    brightcove: 'Brightcove Page',
    html: 'HTML Page',
    quiz: 'Quiz Page',
};

export const PAGE_CAPABILITIES: Record<SupportedPageType, PageCapabilities> = {
    image: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: false,
        supportsFrames: false,
        supportsPreventAutoplay: false,
        supportsAllowFullscreen: false,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    'image-audio': {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: true,
        supportsAllowFullscreen: false,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    bundle: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: true,
        supportsPreventAutoplay: false,
        supportsAllowFullscreen: false,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    video: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: true,
        supportsAllowFullscreen: true,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    youtube: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: true,
        supportsAllowFullscreen: true,
        supportsUseDefaultPlayer: true,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    kaltura: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: true,
        supportsAllowFullscreen: true,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    brightcove: {
        ...NON_QUIZ_CAPS,
        supportsDescription: true,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: true,
        supportsAllowFullscreen: true,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: false,
    },
    html: {
        ...NON_QUIZ_CAPS,
        supportsDescription: false,
        supportsMarkers: true,
        supportsFrames: false,
        supportsPreventAutoplay: false,
        supportsAllowFullscreen: false,
        supportsUseDefaultPlayer: false,
        supportsEmbed: true,
        supportsFullHeight: true,
        supportsAudio: true,
        isQuiz: false,
    },
    quiz: {
        supportsSrc: false,
        supportsTransition: false,
        supportsNote: false,
        supportsDescription: false,
        supportsCopyableContent: false,
        supportsWidget: false,
        supportsMarkers: false,
        supportsFrames: false,
        supportsPreventAutoplay: false,
        supportsAllowFullscreen: false,
        supportsUseDefaultPlayer: false,
        supportsEmbed: false,
        supportsFullHeight: false,
        supportsAudio: false,
        isQuiz: true,
    },
};

export function getPageType(page: Page): SupportedPageType {
    const type = page.$?.type;
    if (type && PAGE_TYPES.includes(type as SupportedPageType)) {
        return type as SupportedPageType;
    }
    return 'image';
}

export function getPageCapabilities(pageType: SupportedPageType): PageCapabilities {
    return PAGE_CAPABILITIES[pageType];
}

export function getQuizSubtype(page: Page): QuizSubtype {
    if (page.multipleChoiceMultiple) return 'multipleChoiceMultiple';
    if (page.shortAnswer) return 'shortAnswer';
    if (page.fillInTheBlank) return 'fillInTheBlank';
    return 'multipleChoiceSingle';
}

export function createDefaultPage(pageType: SupportedPageType): Page {
    const baseAttrs: XmlAttributes = {
        type: pageType,
        title: pageType === 'quiz' ? 'New Quiz' : 'New Page',
    };

    if (PAGE_CAPABILITIES[pageType].supportsPreventAutoplay) {
        baseAttrs.preventAutoplay = 'false';
    }

    const page: Page = { $: baseAttrs };

    if (pageType === 'quiz') {
        page.multipleChoiceSingle = createDefaultMultipleChoiceSingle();
    }

    return page;
}

export function convertPageType(page: Page, targetType: SupportedPageType): Page {
    const targetCaps = PAGE_CAPABILITIES[targetType];
    const next: Page = createDefaultPage(targetType);
    const attrs: XmlAttributes = {
        ...(next.$ ?? {}),
        title: page.$?.title ?? next.$?.title ?? 'New Page',
    };

    if (targetCaps.supportsSrc && page.$?.src) attrs.src = page.$.src;
    if (targetCaps.supportsTransition && page.$?.transition !== undefined) attrs.transition = page.$.transition;
    if (targetCaps.supportsPreventAutoplay) attrs.preventAutoplay = page.$?.preventAutoplay ?? 'false';
    if (targetCaps.supportsAllowFullscreen && page.$?.allowFullscreen !== undefined) attrs.allowFullscreen = page.$.allowFullscreen;
    if (targetCaps.supportsUseDefaultPlayer && page.$?.useDefaultPlayer !== undefined) attrs.useDefaultPlayer = page.$.useDefaultPlayer;
    if (targetCaps.supportsEmbed && page.$?.embed !== undefined) attrs.embed = page.$.embed;
    if (targetCaps.supportsFullHeight && page.$?.fullHeight !== undefined) attrs.fullHeight = page.$.fullHeight;

    next.$ = attrs;

    if (targetCaps.supportsNote && page.note !== undefined) next.note = page.note;
    if (targetCaps.supportsDescription && page.description !== undefined) next.description = page.description;
    if (targetCaps.supportsCopyableContent && page.copyableContent !== undefined) next.copyableContent = page.copyableContent;
    if (targetCaps.supportsWidget && page.widget?.segment) next.widget = { ...(page.widget ?? {}), segment: asArray(page.widget.segment) };
    if (targetCaps.supportsMarkers && page.markers?.marker) next.markers = { ...(page.markers ?? {}), marker: asArray(page.markers.marker) };
    if (targetCaps.supportsFrames && page.frame) next.frame = asArray(page.frame);
    if (targetCaps.supportsAudio && page.audio) next.audio = { ...(page.audio ?? {}) };

    return next;
}

export function convertQuizSubtype(page: Page, subtype: QuizSubtype): Page {
    const next = convertPageType(page, 'quiz');
    const currentSubtype = getQuizSubtype(page);
    const prompt = getQuizPrompt(page);
    const questionAttrs = getQuizQuestionAttrs(page);
    const answers = getQuizAnswers(page);
    const correctFeedback = getQuizCorrectFeedback(page);
    const incorrectFeedback = getQuizIncorrectFeedback(page);
    const shortFeedback = getQuizShortAnswerFeedback(page);
    const retry = currentSubtype === 'multipleChoiceSingle'
        ? page.multipleChoiceSingle?.$?.retry
        : currentSubtype === 'multipleChoiceMultiple'
            ? page.multipleChoiceMultiple?.$?.retry
            : undefined;
    const random = currentSubtype === 'multipleChoiceSingle'
        ? page.multipleChoiceSingle?.choices?.$?.random
        : currentSubtype === 'multipleChoiceMultiple'
            ? page.multipleChoiceMultiple?.choices?.$?.random
            : undefined;

    if (subtype === 'multipleChoiceSingle') {
        next.multipleChoiceSingle = {
            $: retry ? { retry } : undefined,
            question: {
                $: questionAttrs,
                _: prompt,
            },
            choices: {
                $: random ? { random } : undefined,
                answer: ensureChoiceAnswers(answers),
            },
        };
        return next;
    }

    if (subtype === 'multipleChoiceMultiple') {
        next.multipleChoiceMultiple = {
            $: retry ? { retry } : undefined,
            question: {
                $: questionAttrs,
                _: prompt,
            },
            choices: {
                $: random ? { random } : undefined,
                answer: ensureChoiceAnswers(answers),
            },
            correctFeedback,
            incorrectFeedback,
        };
        return next;
    }

    if (subtype === 'shortAnswer') {
        next.shortAnswer = {
            $: questionAttrs,
            question: prompt,
            feedback: shortFeedback || correctFeedback || '',
        };
        return next;
    }

    next.fillInTheBlank = {
        $: questionAttrs,
        question: prompt,
        answer: page.fillInTheBlank?.answer ?? '',
        correctFeedback: correctFeedback || shortFeedback || '',
        incorrectFeedback: incorrectFeedback || '',
    };
    return next;
}

export function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function createDefaultMultipleChoiceSingle(): QuizSingle {
    return {
        question: { $: { image: '', audio: '' }, _: '' },
        choices: {
            answer: ensureChoiceAnswers([]),
        },
    };
}

function ensureChoiceAnswers(answers: QuizAnswer[]): QuizAnswer[] {
    if (answers.length >= 2) {
        return answers.map((answer, index) => ({
            ...answer,
            $: {
                ...(answer.$ ?? {}),
                image: answer.$?.image ?? '',
                audio: answer.$?.audio ?? '',
                correct: index === 0 && !answers.some((item) => item.$?.correct === 'yes') ? 'yes' : answer.$?.correct,
            },
        }));
    }

    return [
        {
            $: { image: '', audio: '', correct: 'yes' },
            value: answers[0]?.value ?? '',
            feedback: answers[0]?.feedback ?? '',
        },
        {
            $: { image: '', audio: '' },
            value: answers[1]?.value ?? '',
            feedback: answers[1]?.feedback ?? '',
        },
    ];
}

function getQuizPrompt(page: Page): string {
    if (page.multipleChoiceSingle) return page.multipleChoiceSingle.question._ ?? '';
    if (page.multipleChoiceMultiple) return page.multipleChoiceMultiple.question._ ?? '';
    if (page.shortAnswer) return page.shortAnswer.question ?? '';
    if (page.fillInTheBlank) return page.fillInTheBlank.question ?? '';
    return '';
}

function getQuizQuestionAttrs(page: Page): XmlAttributes | undefined {
    if (page.multipleChoiceSingle?.question.$) return { ...page.multipleChoiceSingle.question.$ };
    if (page.multipleChoiceMultiple?.question.$) return { ...page.multipleChoiceMultiple.question.$ };
    if (page.shortAnswer?.$) return { ...page.shortAnswer.$ };
    if (page.fillInTheBlank?.$) return { ...page.fillInTheBlank.$ };
    return { image: '', audio: '' };
}

function getQuizAnswers(page: Page): QuizAnswer[] {
    if (page.multipleChoiceSingle?.choices?.answer) return asArray(page.multipleChoiceSingle.choices.answer);
    if (page.multipleChoiceMultiple?.choices?.answer) return asArray(page.multipleChoiceMultiple.choices.answer);
    return [];
}

function getQuizCorrectFeedback(page: Page): string {
    if (page.multipleChoiceMultiple?.correctFeedback) return page.multipleChoiceMultiple.correctFeedback;
    if (page.fillInTheBlank?.correctFeedback) return page.fillInTheBlank.correctFeedback;
    return '';
}

function getQuizIncorrectFeedback(page: Page): string {
    if (page.multipleChoiceMultiple?.incorrectFeedback) return page.multipleChoiceMultiple.incorrectFeedback;
    if (page.fillInTheBlank?.incorrectFeedback) return page.fillInTheBlank.incorrectFeedback;
    return '';
}

function getQuizShortAnswerFeedback(page: Page): string {
    if (page.shortAnswer?.feedback) return page.shortAnswer.feedback;
    return '';
}

export function createEmptyMarker(): Marker {
    return { $: { timecode: '', color: '' }, _: '' };
}

export function createEmptySegment(): Segment {
    return { $: { name: '' }, _: '' };
}

export function createEmptyFrame(): Frame {
    return { $: { start: '' } };
}

export function createEmptyAnswer(): QuizAnswer {
    return { $: { image: '', audio: '' }, value: '', feedback: '' };
}

export function createDefaultShortAnswer(): ShortAnswer {
    return { $: { image: '', audio: '' }, question: '', feedback: '' };
}

export function createDefaultFillInTheBlank(): FillInTheBlank {
    return { $: { image: '', audio: '' }, question: '', answer: '', correctFeedback: '', incorrectFeedback: '' };
}

export function createDefaultMultipleChoiceMultiple(): QuizMultiple {
    return {
        question: { $: { image: '', audio: '' }, _: '' },
        choices: { answer: ensureChoiceAnswers([]) },
        correctFeedback: '',
        incorrectFeedback: '',
    };
}
