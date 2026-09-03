/**
 * Shared description of the legal documents presented on first run and from the
 * About modal. Imported by both the renderer and the main process.
 *
 * The HTML fragments are generated from docs/legal/*.md and the root LICENSE by
 * env-scripts/build-legal-docs.mjs.
 */

/**
 * Bump this whenever TERMS.md or PRIVACY.md changes materially: acceptance is
 * recorded against this value, so a new version re-shows the first-run screen.
 * Keep it in sync with the "Effective Date" in both documents.
 */
export const LEGAL_DOC_VERSION = '2026-09-03';

export type LegalDocId = 'terms' | 'privacy' | 'license';

export interface LegalDoc {
    id: LegalDocId;
    /** Tab label. */
    title: string;
    /** Fragment served out of public/legal/. */
    htmlPath: string;
    /** Shown above the text when the document is informational rather than agreed to. */
    note?: string;
}

export const LEGAL_DOCS: LegalDoc[] = [
    { id: 'terms', title: 'Terms & Conditions', htmlPath: '/legal/terms.html' },
    { id: 'privacy', title: 'Privacy Policy', htmlPath: '/legal/privacy.html' },
    {
        id: 'license',
        title: 'License (GPL-3.0)',
        htmlPath: '/legal/license.html',
        note: '',
    },
];

export const DEFAULT_LEGAL_DOC: LegalDocId = 'terms';

export interface LegalAcceptance {
    /** The LEGAL_DOC_VERSION that was accepted. */
    version: string;
    /** ISO timestamp of the acceptance. */
    acceptedAt: string;
    /** Application version in use at acceptance time. */
    appVersion: string;
}

export interface LegalState {
    accepted: boolean;
    version: string;
}
