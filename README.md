# Storybook Packager

[![Build and Release](https://github.com/Lin87/storybook-packager/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/Lin87/storybook-packager/actions/workflows/release.yml)

A desktop content authoring app for **Storybook+** presentations.

Storybook Packager gives authors a GUI for building and maintaining Storybook+ presentations — the outline, the page content, the quizzes, the media assets, and the `sbplus.xml` manifest that the Storybook+ web player reads — without hand-editing XML or shuffling files between folders.

Built with Electron and a statically exported Next.js renderer. Sponsored by Excelsior University.

## What a presentation is

A presentation is a **folder**, not a single file. The app creates, reads, validates, and saves this structure directly on your computer:

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

Everything the app does is expressed in that folder — there is no separate project file or database. Export is optional and creates a zip archive for sharing or delivery.

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

Exports an optional zip archive for sharing or delivery: the presentation assets plus a freshly serialized `sbplus.xml`. Validation runs first, and the results window opens automatically if there are errors or warnings.

### Saving

Saving is driven by the native File menu — Save (`Ctrl`/`Cmd`+`S`, enabled only when there are unsaved changes), Save As, and Close. Unsaved changes are shown in the window title on Windows and Linux and as the edited dot on macOS, and closing a window with unsaved changes prompts to save, discard, or cancel.

## System requirements

The app ships as a self-contained build — there is nothing to install alongside it, and no Node.js runtime is required to *use* it.

| | Minimum |
| --- | --- |
| Windows | Windows 10 (version 1809) or Windows 11, 64-bit |
| macOS | macOS 12 Monterey or later |
| Linux | A 64-bit distribution with glibc 2.28 or newer (Ubuntu 20.04+, Debian 11+, Fedora 32+) |
| Memory | 4 GB RAM; 8 GB is more comfortable when working with large media |
| Disk | About 750 MB for the installed application (the Windows installer itself is a ~170 MB download), plus whatever your presentations need — media assets dominate that figure |
| Display | 1024 × 768 or larger. The editor window enforces that as its minimum size |
| Network | Not required. The app works entirely offline; the only request it makes on its own is the update check described below |

Release builds include Windows x64, macOS Apple Silicon, and Linux x64 installers.

## Installing

Download the build for your platform from the [releases page](https://github.com/Lin87/storybook-packager/releases).

**Windows** — run `Storybook Packager Setup <version>.exe`. Windows SmartScreen will warn that the publisher is unrecognized because the build is not code-signed; choose **More info → Run anyway**. There is no setup wizard: the installer places the app in your user profile, adds Start Menu and desktop shortcuts, and launches it. No administrator rights are needed.

**macOS** — open the `.dmg` and drag **Storybook Packager** into Applications. The build is neither signed nor notarized, so the first launch is blocked by Gatekeeper. Dismiss the warning, then open **System Settings → Privacy & Security**, find the message about Storybook Packager being blocked, and click **Open Anyway**.

**Linux** — make the `.AppImage` executable and run it:

```bash
chmod +x "Storybook Packager-<version>.AppImage"
./"Storybook Packager-<version>.AppImage"
```

There is no installation step; the AppImage is the whole application.

On first launch the app shows the agreement screen described under [First launch](#first-launch) before anything else.

## Updating

Updates are **notify-only**. The app tells you when a new version exists but never downloads or installs anything on its own — installing is always a deliberate act, because the builds are unsigned and a silent background install of an unsigned binary is not something the app should do to you.

**How you find out.** A few seconds after launch, at most once a day, the app asks GitHub whether a newer release has been published. If one has, a dialog offers **Download Now** or **Remind Me Later**; if you are up to date, or offline, that check passes in silence. You can also ask at any time — **Help → Check for Updates…**, or the **Check for Updates** button in **Help → About Storybook Packager**, which re-checks each time it opens. An explicit check always answers, including "you are up to date". On Windows and Linux the menu bar is only present in editor windows, so from the welcome screen use the About button.

**Remind Me Later** hides that particular version from the launch-time prompt for seven days. A manual check still reports it, and a different, newer version prompts you straight away rather than inheriting the delay.

**Installing the update.** Download Now opens the release page in your browser. Install the new version the same way you installed the first one:

- **Windows** — run the new installer. It replaces the existing installation without prompting and relaunches the app.
- **macOS** — drag the new app into Applications and confirm the replacement.
- **Linux** — the new AppImage is a separate file; delete the old one yourself once you are happy with it.

Your presentations are never touched — they are ordinary folders on disk, independent of the app. Recent-projects history, window positions, and your acceptance of the Terms and Privacy Policy also carry across an update, so you will not see the agreement screen again unless those documents change materially.

## Development requirements

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

This builds the Next.js static export, compiles the Electron main process, and runs `electron-builder` — producing `Storybook Packager Setup <version>.exe` (NSIS) on Windows, `Storybook Packager-<version>.dmg` on macOS, and `Storybook Packager-<version>.AppImage` on Linux, in `dist/`. Each installer can only be built on its own platform; the release workflow builds Windows x64, macOS Apple Silicon, and Linux x64 installers on matching GitHub-hosted runners.

The artifact and shortcut names come from `build.productName`, which must stay in step with the `app.setName('Storybook Packager')` call at the top of [src/electron/main.ts](src/electron/main.ts) — that one sets the userData folder name and the macOS app menu title. The kebab-case `storybook-packager` elsewhere (the npm package name, the `appId`, the repository) is identifier-shaped and intentionally stays lowercase.

## Releasing

The in-app update check reads the latest published release of [`Lin87/storybook-packager`](https://github.com/Lin87/storybook-packager/releases) from GitHub's public API. To publish a version, bump `version` in `package.json` and push the change to `main`.

The [Build and Release](https://github.com/Lin87/storybook-packager/actions/workflows/release.yml) workflow reads that version, fails if the matching `v<version>` tag already exists, builds the Windows x64, macOS Apple Silicon, and Linux x64 installers, creates the `v<version>` tag, and publishes the GitHub Release with the installers attached.

The tag must be `v<version>`, matching `package.json` exactly. `/releases/latest` skips drafts and prereleases, so marking a release as a prerelease is the way to stage a build without notifying anyone. The repository must stay public — the app makes an unauthenticated request and ships no token.

Builds are unsigned on all three platforms, so the automated release notes repeat the platform-specific warnings from [Installing](#installing) — the SmartScreen bypass on Windows and the Privacy & Security → Open Anyway step on macOS. Users who do not expect those warnings tend to assume the download is broken.

## Project layout

| Path | Purpose |
| --- | --- |
| [src/app/](src/app/) | Next.js App Router entries — welcome screen at `/`, first-run agreement at `/first-run`, editor at `/editor` |
| [src/electron/](src/electron/) | Electron main process: windows, native menu, dialogs, filesystem, XML I/O |
| [src/features/welcome/](src/features/welcome/) | Welcome screen UI |
| [src/features/authoring/](src/features/authoring/) | The editor — sidebar, panels, page editors, domain model, state |
| [src/lib/](src/lib/) | Platform-independent validation and export logic |
| [src/components/](src/components/) | App-wide shared UI (dialogs, form controls, toasts) |
| [src/types/](src/types/) | `sbplus.xml` domain types and ambient declarations |
| [src/styles/](src/styles/) | Global SCSS design tokens and keyframes |
| [src/vendor/](src/vendor/) | Vendored third-party UI (TipTap simple editor template) |

## First launch

On first launch the app shows an agreement screen instead of the welcome screen. It presents the [Terms and Conditions](docs/legal/TERMS.md) and [Privacy Policy](docs/legal/PRIVACY.md), which must be accepted before the app can be used, alongside the [GPL-3.0 license](LICENSE) for reference. Declining exits the app. All three documents remain available afterwards from Help → About.

Acceptance is recorded per document version in the app's data folder, so materially updated documents are presented again. The in-app copies are generated from `docs/legal/*.md` and `LICENSE` into `public/legal/` by `npm run build:legal`, which runs automatically before `npm run dev` and `npm run build:next`.

## Status

Version 0.1.0, in active development. Known gaps:

- The app is not code-signed on any platform, which is why installing and updating carry the warnings described under [Installing](#installing), and why [Updating](#updating) is notify-only rather than automatic.

## Legal

- [Terms and Conditions](docs/legal/TERMS.md)
- [Privacy Policy](docs/legal/PRIVACY.md)

## License

[GNU General Public License v3.0](LICENSE).

## Copyright

Copyright &copy; 2026 Ethan Lin. Storybook Packager is sponsored by Excelsior University.
