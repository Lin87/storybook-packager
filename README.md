# Storybook Packager

A desktop content authoring app for **Storybook+** presentations.

Storybook Packager gives authors a GUI for building and maintaining Storybook+ presentations — the outline, the page content, the quizzes, the media assets, and the `sbplus.xml` manifest that the Storybook+ web player reads — without hand-editing XML or shuffling files between folders.

Built with Electron and a statically exported Next.js renderer. Sponsored by Excelsior University.

## What a presentation is

A presentation is a **folder**, not a single file. The app creates, reads, validates, and exports this structure:

```text
<presentation>/
└── assets/
    ├── sbplus.xml            # the manifest the app reads and writes
    ├── splash.jpg            # splash image (extension follows splashImgFormat)
    ├── pages/                # page images
    ├── audio/                # page and bundle audio
    ├── video/                # video files
    ├── images/               # quiz and inline images
    └── html/                 # embedded HTML pages
```

Everything the app does is expressed in that folder — there is no separate project file or database.

## Features

### Welcome screen

- Create a new presentation: pick a folder, and the app scaffolds the asset tree and a seed `sbplus.xml` with one section and one page.
- Open an existing presentation, with a clear error if the folder has no `assets/sbplus.xml`.
- Recent presentations list (up to 10), which prunes entries whose folders no longer exist.

### Outline editing

- Sections and pages in a collapsible sidebar tree.
- Drag and drop to reorder sections, reorder pages, or move a page into a different section, with a live drop indicator and auto-scroll.
- Add and delete sections and pages, with confirmation before a delete.

### Page types

Nine page types — Image, Image + Audio, Bundle, Video, YouTube, Kaltura, Brightcove, HTML, and Quiz. A capability matrix decides which fields each type exposes, and changing a page's type converts it in place, preserving everything the target type supports.

### Page editor

- Source field with a contextual upload button and a live preview (image, audio player, or embedded iframe depending on the type).
- Bundle frames: an ordered list of frame images with `hh:mm:ss` start times that are validated to stay in order.
- Notes, descriptions, and copyable content.
- Markers (timecode, color, label) and widget segments.
- Page transitions, autoplay/fullscreen/default-player toggles, and inline audio attributes for HTML pages.

### Quizzes

Four quiz subtypes — multiple choice (single answer), multiple choice (multiple answers), short answer, and fill in the blank — with a rich-text editor for questions and feedback, per-answer image and audio, retry and answer-randomization options, and correct/incorrect feedback.

### Presentation settings

Accent color, page and splash image formats, downloadable file name, analytics and MathJax toggles, plus title, subtitle, duration, splash image, author name, author biography, and general information.

### Asset management

Uploading a splash image, page image, page or bundle audio, video, quiz media, or an HTML file opens a filtered native file picker, then copies the file into the correct folder under the correct name, replacing any previous file for that page.

### Validation

A one-click check that reports missing assets, empty required sources, missing HTML files, invalid page or quiz types, missing or placeholder page titles, bundle frame timing gaps, and duplicate local targets — grouped by error, warning, and info severity in a results window. External URLs are skipped.

### Export

Exports a clean, self-contained copy of the presentation to a folder you choose: the full asset tree plus a freshly serialized `sbplus.xml`. Validation runs first, and the results window opens automatically if there are errors or warnings.

### Saving

Saving is driven by the native File menu — Save (`Ctrl`/`Cmd`+`S`, enabled only when there are unsaved changes), Save As, and Close. Unsaved changes are shown in the window title on Windows and Linux and as the edited dot on macOS, and closing a window with unsaved changes prompts to save, discard, or cancel.

## Requirements

- Node.js 24.x and npm (developed against Node 24.13, npm 11.19)
- Windows, macOS, or Linux

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` runs the Next.js dev server on port 3000 and launches Electron against it once the server is up, with both processes' output interleaved.

To run the app the way it behaves when packaged (static export served over a local Express server instead of the dev server):

```bash
npm run start:electron:prod
```

## Building

```bash
npm run build:prod
```

This builds the Next.js static export, compiles the Electron main process, and runs `electron-builder` — producing an NSIS installer on Windows, a DMG on macOS, and an AppImage on Linux, in `dist/`.

## Project layout

| Path | Purpose |
| --- | --- |
| [src/app/](src/app/) | Next.js App Router entries — welcome screen at `/`, editor at `/editor` |
| [src/electron/](src/electron/) | Electron main process: windows, native menu, dialogs, filesystem, XML I/O |
| [src/features/welcome/](src/features/welcome/) | Welcome screen UI |
| [src/features/authoring/](src/features/authoring/) | The editor — sidebar, panels, page editors, domain model, state |
| [src/lib/](src/lib/) | Platform-independent validation and export logic |
| [src/components/](src/components/) | App-wide shared UI (dialogs, form controls, toasts) |
| [src/types/](src/types/) | `sbplus.xml` domain types and ambient declarations |
| [src/styles/](src/styles/) | Global SCSS design tokens and keyframes |
| [src/vendor/](src/vendor/) | Vendored third-party UI (TipTap simple editor template) |

## Status

Version 0.1.0, in active development. Known gaps:

- Help → About and Help → Check for Updates are placeholders.
- There is no auto-update mechanism.
- Export produces a packaged folder, not an archive.

## License

[GNU General Public License v3.0](LICENSE).
