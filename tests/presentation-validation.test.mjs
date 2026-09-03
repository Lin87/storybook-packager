import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';
import { Builder, parseStringPromise } from 'xml2js';

import { exportPresentationPackageToDirectory, exportPresentationPackageToZip } from '../.test-build/lib/presentationPackage.js';
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

function listZipEntries(zipPath) {
    const data = fs.readFileSync(zipPath);
    return readZipEntries(data).map((entry) => entry.name);
}

function readZipEntryText(zipPath, entryName) {
    const data = fs.readFileSync(zipPath);
    const entry = readZipEntries(data).find((item) => item.name === entryName);

    assert.ok(entry, `Expected zip entry ${entryName}`);

    const localHeaderOffset = entry.localHeaderOffset;
    assert.equal(data.readUInt32LE(localHeaderOffset), 0x04034b50, 'Expected local file header');

    const fileNameLength = data.readUInt16LE(localHeaderOffset + 26);
    const extraFieldLength = data.readUInt16LE(localHeaderOffset + 28);
    const contentStart = localHeaderOffset + 30 + fileNameLength + extraFieldLength;
    const compressed = data.subarray(contentStart, contentStart + entry.compressedSize);

    if (entry.compressionMethod === 0) {
        return compressed.toString('utf8');
    }

    assert.equal(entry.compressionMethod, 8, 'Expected stored or deflated zip entry');
    return zlib.inflateRawSync(compressed).toString('utf8');
}

function readZipEntries(data) {
    let endOfCentralDirectory = -1;

    for (let i = data.length - 22; i >= 0; i--) {
        if (data.readUInt32LE(i) === 0x06054b50) {
            endOfCentralDirectory = i;
            break;
        }
    }

    assert.notEqual(endOfCentralDirectory, -1, 'Expected zip end of central directory record');

    const entryCount = data.readUInt16LE(endOfCentralDirectory + 10);
    const centralDirectoryOffset = data.readUInt32LE(endOfCentralDirectory + 16);
    const entries = [];
    let offset = centralDirectoryOffset;

    for (let i = 0; i < entryCount; i++) {
        assert.equal(data.readUInt32LE(offset), 0x02014b50, 'Expected central directory file header');

        const compressionMethod = data.readUInt16LE(offset + 10);
        const compressedSize = data.readUInt32LE(offset + 20);
        const fileNameLength = data.readUInt16LE(offset + 28);
        const extraFieldLength = data.readUInt16LE(offset + 30);
        const fileCommentLength = data.readUInt16LE(offset + 32);
        const localHeaderOffset = data.readUInt32LE(offset + 42);
        const nameStart = offset + 46;

        entries.push({
            name: data.subarray(nameStart, nameStart + fileNameLength).toString('utf8'),
            compressionMethod,
            compressedSize,
            localHeaderOffset,
        });
        offset = nameStart + fileNameLength + extraFieldLength + fileCommentLength;
    }

    return entries;
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

test('zip export contains current XML and omits empty asset folders', async () => {
    const sourcePath = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-source-'));
    const targetPath = path.join(os.tmpdir(), `storybook-package-${Date.now()}.zip`);
    const xmlContent = '<storybook><setup><title>Zip Test</title></setup></storybook>';

    fs.mkdirSync(path.join(sourcePath, 'assets', 'audio'), { recursive: true });
    fs.mkdirSync(path.join(sourcePath, 'assets', 'images'), { recursive: true });
    fs.mkdirSync(path.join(sourcePath, 'assets', 'pages'), { recursive: true });
    fs.writeFileSync(path.join(sourcePath, 'assets', 'pages', 'slide01.jpg'), 'image data');
    fs.writeFileSync(path.join(sourcePath, 'assets', 'sbplus.xml'), '<storybook></storybook>');

    await exportPresentationPackageToZip({
        sourcePath,
        targetPath,
        xmlContent,
    });

    const entries = listZipEntries(targetPath);

    assert.ok(fs.existsSync(targetPath));
    assert.ok(fs.statSync(targetPath).size > 0);
    assert.ok(entries.includes('assets/sbplus.xml'));
    assert.ok(entries.includes('assets/pages/slide01.jpg'));
    assert.ok(entries.some((entry) => entry.startsWith('assets/pages/')));
    assert.equal(entries.some((entry) => entry.startsWith('assets/audio/')), false);
    assert.equal(entries.some((entry) => entry.startsWith('assets/images/')), false);
    assert.equal(entries.includes('assets/'), false);
    assert.equal(readZipEntryText(targetPath, 'assets/sbplus.xml'), xmlContent);
});
