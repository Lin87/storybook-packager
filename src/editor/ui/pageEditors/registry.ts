import GenericPageEditor from './GenericPageEditor';
import type { PageEditorRegistration } from './types';

const REGISTRY: Record<string, PageEditorRegistration> = {
    image: { label: 'Image Page', Editor: GenericPageEditor },
    'image-audio': { label: 'Image + Audio Page', Editor: GenericPageEditor },
    bundle: { label: 'Bundle Page', Editor: GenericPageEditor },
    video: { label: 'Video Page', Editor: GenericPageEditor },
    youtube: { label: 'YouTube Page', Editor: GenericPageEditor },
    kaltura: { label: 'Kaltura Page', Editor: GenericPageEditor },
    brightcove: { label: 'Brightcove Page', Editor: GenericPageEditor },

    html: { label: 'HTML Page', Editor: GenericPageEditor },
    quiz: { label: 'Quiz Page', Editor: GenericPageEditor },
};

const FALLBACK: PageEditorRegistration = { label: 'Page Editor', Editor: GenericPageEditor };

export function getPageEditorRegistration(pageType: string): PageEditorRegistration {
    return REGISTRY[pageType] ?? FALLBACK;
}
