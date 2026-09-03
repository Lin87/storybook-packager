import { PAGE_TYPE_LABELS, type SupportedPageType } from '@/features/authoring/model/pageModel';
import QuizPageEditor from './QuizPageEditor';
import StandardPageEditor from './StandardPageEditor';
import type { PageEditorRegistration } from './pageEditorTypes';

const REGISTRY: Record<SupportedPageType, PageEditorRegistration> = {
    image: { label: PAGE_TYPE_LABELS.image, Editor: StandardPageEditor },
    'image-audio': { label: PAGE_TYPE_LABELS['image-audio'], Editor: StandardPageEditor },
    bundle: { label: PAGE_TYPE_LABELS.bundle, Editor: StandardPageEditor },
    video: { label: PAGE_TYPE_LABELS.video, Editor: StandardPageEditor },
    youtube: { label: PAGE_TYPE_LABELS.youtube, Editor: StandardPageEditor },
    kaltura: { label: PAGE_TYPE_LABELS.kaltura, Editor: StandardPageEditor },
    brightcove: { label: PAGE_TYPE_LABELS.brightcove, Editor: StandardPageEditor },
    html: { label: PAGE_TYPE_LABELS.html, Editor: StandardPageEditor },
    quiz: { label: PAGE_TYPE_LABELS.quiz, Editor: QuizPageEditor },
};

const FALLBACK: PageEditorRegistration = { label: 'Page Editor', Editor: StandardPageEditor };

export function getPageEditorRegistration(pageType: string): PageEditorRegistration {
    return pageType in REGISTRY ? REGISTRY[pageType as SupportedPageType] : FALLBACK;
}
