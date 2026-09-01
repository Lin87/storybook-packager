const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Builder, parseStringPromise } = require('xml2js');

const repoRoot = path.resolve(__dirname, '..');
const samplePath = path.resolve(repoRoot, '..', 'storybook-plus', 'assets', 'sbplus.xml');

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

function normalizeStorybookXml(xml) {
    const next = clone(xml);

    next.storybook.section = asArray(next.storybook.section).map((section) => ({
        ...section,
        page: asArray(section.page).map((page) => {
            const normalizedPage = { ...page };

            if (normalizedPage.frame) {
                normalizedPage.frame = asArray(normalizedPage.frame);
            }

            if (normalizedPage.markers?.marker) {
                normalizedPage.markers = {
                    ...normalizedPage.markers,
                    marker: asArray(normalizedPage.markers.marker),
                };
            }

            if (normalizedPage.widget?.segment) {
                normalizedPage.widget = {
                    ...normalizedPage.widget,
                    segment: asArray(normalizedPage.widget.segment),
                };
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
    const builder = new Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' },
        cdata: true,
    });

    return builder.buildObject(normalizeStorybookXml(xml));
}

async function readSample() {
    assert.ok(fs.existsSync(samplePath), `Expected Storybook+ sample at ${samplePath}`);
    return parseStringPromise(fs.readFileSync(samplePath, 'utf8'), parseOptions);
}

function allPages(xml) {
    return asArray(xml.storybook.section).flatMap((section) => asArray(section.page));
}

function countBy(values) {
    return values.reduce((counts, value) => {
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
    }, {});
}

test('sample sbplus.xml parses with expected sections, pages, and page types', async () => {
    const xml = await readSample();
    const sections = asArray(xml.storybook.section);
    const pages = allPages(xml);

    assert.equal(sections.length, 3);
    assert.equal(pages.length, 36);
    assert.deepEqual(countBy(pages.map((page) => page.$.type)), {
        'image-audio': 12,
        bundle: 1,
        quiz: 11,
        video: 1,
        kaltura: 1,
        brightcove: 1,
        youtube: 1,
        html: 7,
        image: 1,
    });
});

test('sample quiz subtypes are recognized', async () => {
    const pages = allPages(await readSample());
    const quizSubtypes = pages
        .filter((page) => page.$.type === 'quiz')
        .map((page) => ['multipleChoiceSingle', 'multipleChoiceMultiple', 'shortAnswer', 'fillInTheBlank'].find((key) => page[key]));

    assert.deepEqual(countBy(quizSubtypes), {
        multipleChoiceSingle: 6,
        shortAnswer: 1,
        fillInTheBlank: 1,
        multipleChoiceMultiple: 3,
    });
});

test('sample features survive parse, build, and parse', async () => {
    const original = await readSample();
    const rebuilt = buildStorybookXml(original);
    const reparsed = await parseStringPromise(rebuilt, parseOptions);
    const pages = allPages(reparsed);

    assert.equal(reparsed.storybook.$.analytics, 'off');
    assert.equal(reparsed.storybook.setup.$.splashImg, 'technology_single_red');

    const firstPage = pages.find((page) => page.$.title === 'Cooking Baking: Chocolate Chip Cookies');
    assert.equal(firstPage.$.allowFullscreen, 'true');

    const recipePage = pages.find((page) => page.copyableContent);
    assert.match(recipePage.copyableContent, /2 cups chocolate morsels/);

    const bundlePage = pages.find((page) => page.$.type === 'bundle');
    assert.equal(asArray(bundlePage.frame).length, 2);
    assert.equal(asArray(bundlePage.markers.marker).length, 2);

    const youtubePage = pages.find((page) => page.$.type === 'youtube');
    assert.equal(asArray(youtubePage.widget.segment).length, 3);

    const htmlAudioPage = pages.find((page) => page.$.title === 'HTML Page with Audio and Markers');
    assert.equal(htmlAudioPage.audio.$.src, 'slide02');
    assert.equal(asArray(htmlAudioPage.markers.marker).length, 2);
});

test('page capabilities match intentional Storybook+ editing boundaries', () => {
    const pageModel = fs.readFileSync(path.join(repoRoot, 'src', 'editor', 'pageModel.ts'), 'utf8');
    const electronMain = fs.readFileSync(path.join(repoRoot, 'src', 'electron', 'main.ts'), 'utf8');
    const imageAudioBlock = pageModel.match(/'image-audio': \{[\s\S]*?\n    \}/)?.[0] ?? '';
    const htmlBlock = pageModel.match(/\n    html: \{[\s\S]*?\n    \}/)?.[0] ?? '';

    assert.match(imageAudioBlock, /supportsAllowFullscreen:\s*false/);
    assert.match(htmlBlock, /supportsMarkers:\s*true/);
    assert.match(htmlBlock, /supportsAudio:\s*true/);
    assert.match(electronMain, /cdata:\s*true/);
});
