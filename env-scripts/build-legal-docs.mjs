/**
 * Converts the project's legal documents into HTML fragments under public/legal/
 * so the first-run agreement screen and the About modal can render them offline.
 *
 * docs/legal/*.md and the root LICENSE stay the single source of truth; this
 * script runs from the `predev` / `prebuild:next` hooks, and public/legal/ is
 * gitignored.
 *
 * Bump LEGAL_DOC_VERSION in src/lib/legal.ts whenever the text changes
 * materially, so accepted users are re-prompted.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const outDir = path.join(repoRoot, 'public', 'legal');

/**
 * Hrefs the viewer understands as in-app tab switches. Everything else has to
 * be unwrapped: the app has no external-browser capability, so a surviving
 * link would open a bare Electron window.
 */
const TAB_ANCHORS = new Set(['#legal-terms', '#legal-privacy', '#legal-license']);

/** Relative markdown links rewritten to their in-app tab equivalent. */
const LINK_REWRITES = {
    'PRIVACY.md': '#legal-privacy',
    'TERMS.md': '#legal-terms',
    '../../LICENSE': '#legal-license',
};

const documents = [
    { source: 'docs/legal/TERMS.md', out: 'terms.html', format: 'markdown' },
    { source: 'docs/legal/PRIVACY.md', out: 'privacy.html', format: 'markdown' },
    { source: 'LICENSE', out: 'license.html', format: 'text' },
];

function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Rewrites the known relative links, then unwraps every anchor that is not an
 * in-app tab link so no href can escape the app.
 */
function normalizeLinks(html, sourceLabel) {
    const rewritten = html.replace(/<a href="([^"]*)"([^>]*)>/g, (match, href, rest) => {
        const target = LINK_REWRITES[href];
        return target ? `<a href="${target}"${rest}>` : match;
    });

    return rewritten.replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (match, href, text) => {
        if (TAB_ANCHORS.has(href)) return match;

        // Contact addresses are autolinked by GFM; unwrapping leaves the address
        // itself visible, so that case is expected rather than a problem.
        if (!href.startsWith('mailto:')) {
            console.warn(`⚠️  ${sourceLabel}: unwrapped link to "${href}" (the app cannot open external links).`);
        }

        return text;
    });
}

function renderMarkdown(raw, sourceLabel) {
    const html = marked.parse(raw, { async: false, gfm: true });
    return `<div class="legal-doc">\n${normalizeLinks(html, sourceLabel)}</div>\n`;
}

/**
 * The LICENSE is fixed-width ASCII rather than markdown, so it is escaped and
 * kept preformatted instead of being run through `marked`.
 */
function renderPlainText(raw) {
    return `<div class="legal-doc">\n<pre class="legal-plain">${escapeHtml(raw)}</pre>\n</div>\n`;
}

fs.mkdirSync(outDir, { recursive: true });

for (const doc of documents) {
    const sourcePath = path.join(repoRoot, doc.source);

    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ Missing legal source file: ${doc.source}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const html = doc.format === 'markdown' ? renderMarkdown(raw, doc.source) : renderPlainText(raw);

    fs.writeFileSync(path.join(outDir, doc.out), html, 'utf-8');
    console.log(`📄 ${doc.source} → public/legal/${doc.out}`);
}
