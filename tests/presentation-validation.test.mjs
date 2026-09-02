import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Builder, parseStringPromise } from 'xml2js';

import { exportPresentationPackageToDirectory } from '../.test-build/lib/presentationPackage.js';
import { validatePresentation } from '../.test-build/lib/presentationValidation.js';

const repoRoot = path.resolve(import.meta.dirname, '..');
const samplePresentationPath = path.resolve(repoRoot, '..', 'storybook-plus');
const sampleXmlPath = path.join(samplePresentationPath, 'assets', 'sbplus.xml');

const parseOptions = {
    explicitArray: false,
    trim: true,
    explicitCharkey: false,
    mergeAttrs: false,
    preserveChildrenOrder: true,
    explicitRoot: true,
    charsAsChildren: false,
    explicitChildren: false,
    includeWhiteChars: false,
};

function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

async function readSample() {
    assert.ok(fs.existsSync(sampleXmlPath), `Expected Storybook+ sample at ${sampleXmlPath}`);
    return parseStringPromise(fs.readFileSync(sampleXmlPath, 'utf8'), parseOptions);
}

function createFileSystem(rootPath) {
    return {
        exists: (relativePath) => fs.existsSync(path.join(rootPath, relativePath)),
        listFiles: (relativeDirectory) => {
            const directory = path.join(rootPath, relativeDirectory);
            if (!fs.existsSync(directory)) return [];

            return fs
                .readdirSync(directory, { withFileTypes: true })
                .filter((entry) => entry.isFile())
                .map((entry) => entry.name);
        },
    };
}

function normalizeStorybookXml(xml) {
    const next = clone(xml);

    next.storybook.section = asArray(next.storybook.section).map((section) => ({
        ...section,
        page: asArray(section.page).map((page) => {
            const normalizedPage = { ...page };

            if (normalizedPage.frame) normalizedPage.frame = asArray(normalizedPage.frame);
            if (normalizedPage.markers?.marker) {
                normalizedPage.markers = { ...normalizedPage.markers, marker: asArray(normalizedPage.markers.marker) };
            }
            if (normalizedPage.widget?.segment) {
                normalizedPage.widget = { ...normalizedPage.widget, segment: asArray(normalizedPage.widget.segment) };
            }
            if (normalizedPage.multipleChoiceSingle?.choices?.answer) {
                normalizedPage.multipleChoiceSingle = {
                    ...normalizedPage.multipleChoiceSingle,
                    choices: {
                        ...normalizedPage.multipleChoiceSingle.choices,
                        answer: asArray(normalizedPage.multipleChoiceSingle.choices.answer),
                    },
                };
            }
            if (normalizedPage.multipleChoiceMultiple?.choices?.answer) {
                normalizedPage.multipleChoiceMultiple = {
                    ...normalizedPage.multipleChoiceMultiple,
                    choices: {
                        ...normalizedPage.multipleChoiceMultiple.choices,
                        answer: asArray(normalizedPage.multipleChoiceMultiple.choices.answer),
                    },
                };
            }

            return normalizedPage;
        }),
    }));

    return next;
}

function buildStorybookXml(xml) {
    return new Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' },
        cdata: true,
    }).buildObject(normalizeStorybookXml(xml));
}

test('sample presentation validates against real assets and ignores external URLs', async () => {
    const xml = await readSample();
    const result = validatePresentation(xml, { fileSystem: createFileSystem(samplePresentationPath) });
    const missingTargets = result.items
        .filter((item) => item.code === 'MISSING_ASSET' || item.code === 'MISSING_HTML')
        .map((item) => item.target);

    assert.ok(missingTargets.includes('assets/pages/slide02.jpg'));
    assert.ok(missingTargets.includes('assets/audio/slide03.mp3'));
    assert.ok(!missingTargets.some((target) => target?.includes('https://')));
    assert.equal(result.items.some((item) => item.code === 'INVALID_PAGE_TYPE'), false);
    assert.equal(result.items.some((item) => item.code === 'INVALID_QUIZ_SUBTYPE'), false);
});

test('validation reports empty src, invalid types, weak titles, missing quiz media, missing html, and bundle gaps', async () => {
    const xml = await readSample();
    const firstSection = asArray(xml.storybook.section)[0];
    const pages = asArray(firstSection.page);

    pages[0].$.src = '';
    pages[0].$.title = '';
    pages[1].$.type = 'not-a-page-type';
    pages[1].$.title = 'New Page';
    pages[2].$.type = 'html';
    pages[2].$.src = 'missing-local-html';
    pages[3].$.type = 'quiz';
    pages[3].multipleChoiceSingle = {
        question: { $: { image: 'missing-question.png', audio: 'missing-question.mp3' }, _: 'Question' },
        choices: { answer: [{ $: { image: 'missing-answer.png', audio: 'missing-answer.mp3', correct: 'yes' }, value: 'Answer' }] },
    };

    const result = validatePresentation(xml, {
        fileSystem: {
            exists: (relativePath) => ![
                'assets/pages/slide13-2.jpg',
                'assets/html/missing-local-html.html',
                'assets/html/missing-local-html/index.html',
                'assets/images/missing-question.png',
                'assets/audio/missing-question.mp3',
                'assets/images/missing-answer.png',
                'assets/audio/missing-answer.mp3',
            ].includes(relativePath),
            listFiles: () => ['slide13-1.jpg', 'slide13-3.jpg'],
        },
    });
    const codes = result.items.map((item) => item.code);

    assert.ok(codes.includes('EMPTY_REQUIRED_SRC'));
    assert.ok(codes.includes('INVALID_PAGE_TYPE'));
    assert.ok(codes.includes('MISSING_PAGE_TITLE'));
    assert.ok(codes.includes('PLACEHOLDER_PAGE_TITLE'));
    assert.ok(codes.includes('MISSING_HTML'));
    assert.equal(result.items.filter((item) => item.message.includes('quiz')).length >= 4, true);
    assert.ok(codes.includes('BUNDLE_FRAME_GAP'));
});

test('validation warns about duplicate local asset targets', async () => {
    const xml = await readSample();
    const result = validatePresentation(xml, { fileSystem: createFileSystem(samplePresentationPath) });

    assert.ok(result.items.some((item) => item.code === 'DUPLICATE_LOCAL_TARGET' && item.target === 'assets/pages/slide03.jpg'));
});

test('exported package contains Storybook+ asset structure and current XML', async () => {
    const xml = await readSample();
    const targetPath = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-package-'));
    const xmlContent = buildStorybookXml(xml);

    exportPresentationPackageToDirectory({
        sourcePath: samplePresentationPath,
        targetPath,
        xmlContent,
    });

    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'sbplus.xml')));
    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'audio')));
    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'video')));
    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'images')));
    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'html')));
    assert.ok(fs.existsSync(path.join(targetPath, 'assets', 'pages')));
    assert.equal(fs.readFileSync(path.join(targetPath, 'assets', 'sbplus.xml'), 'utf8'), xmlContent);
});
