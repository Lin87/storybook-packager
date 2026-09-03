# AGENTS.md

Working notes for coding agents on **Storybook Packager**. See [README.md](README.md) for what the app does from a user's point of view.

## Architecture

An Electron desktop app with a Next.js renderer:

- **Main process** — [src/electron/main.ts](src/electron/main.ts) owns windows, the native menu, native dialogs, all filesystem access, and `sbplus.xml` parsing/serialization. [src/electron/preload.cjs](src/electron/preload.cjs) exposes `window.electronAPI` over `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`).
- **Renderer** — Next.js App Router built as a **static export** (`output: 'export'`, `distDir: 'out'` in [next.config.ts](next.config.ts)). In dev it loads `http://localhost:3000`; in packaged builds `main.ts` starts an Express static server on a free port in 3005–3999 (`startStaticServer()` + `get-port`) and loads that.
- Two windows: a frameless welcome window (`/`) and editor windows (`/editor?path=<encoded folder>`). Window bounds are persisted by [src/electron/windowState.ts](src/electron/windowState.ts); the recent-files MRU and window state live as JSON in `app.getPath('userData')`.

There is no browser storage anywhere — no localStorage, no IndexedDB. All persistence is Node `fs` in the main process.

## Commands

Run with npm (lockfile is `package-lock.json`; there is no `packageManager` or `engines` field). Local toolchain: Node 24.13, npm 11.19.

| Command | What it does |
| --- | --- |
| `npm run dev` | Next dev server + Electron, concurrently. The usual dev loop. |
| `npm run dev:next` | Next dev server only. |
| `npm run start:electron:dev` | Waits for :3000, compiles the main process, launches Electron. |
| `npm run start:electron:prod` | Full production-shaped run (static export + Express server). |
| `npm run build:next` | `next build` → `out/` |
| `npm run build:electron` | `tsc -p tsconfig.electron.json` → `dist-electron/` |
| `npm run build:prod` | next + electron + `predist` + `electron-builder` → `dist/` |
| `npm run test:compat` | XML round-trip fidelity test. |
| `npm run test:validation` | Compiles `tsconfig.tests.json`, then runs validation + export tests. |

**There is no `lint` script** — run `npx eslint .`. **There is no aggregate `test` script** — run the two test scripts individually.

## Tests

No framework: both suites use the built-in `node:test` runner.

- [tests/sbplus-compatibility.test.cjs](tests/sbplus-compatibility.test.cjs) — parse → normalize → rebuild round-trip fidelity.
- [tests/presentation-validation.test.mjs](tests/presentation-validation.test.mjs) — validation and export against a real sample; imports compiled output from `.test-build/lib/`, so `test:validation` must run the `tsc` step first.

**Both suites require a sibling checkout at `../storybook-plus` containing `assets/sbplus.xml`.** Without it they hard-fail — that is a missing fixture, not a regression.

## Stack

Electron 44 · electron-builder 26 · Next 16 · React 19 · TypeScript 6 (pinned exact) · Tailwind v4 + daisyUI 5 · `xml2js` · `@dnd-kit` (core/sortable/utilities) · TipTap 3 (+ Radix and Base UI primitives) · `react-bootstrap-icons` · Express 5 + `get-port` · `sass` (for vendored TipTap tokens only).

Three tsconfigs, all `strict`:

| File | Scope | Output |
| --- | --- | --- |
| [tsconfig.json](tsconfig.json) | Renderer. Alias `@/*` → `./src/*` | `noEmit` |
| [tsconfig.electron.json](tsconfig.electron.json) | `src/electron/**` | `dist-electron/` |
| [tsconfig.tests.json](tsconfig.tests.json) | The two `src/lib` modules + `src/types/sbplus.ts` | `.test-build/` |

Styling is **Tailwind v4 CSS-first** — there is no `tailwind.config.*`. Config lives at the top of [src/app/globals.css](src/app/globals.css) (`@import 'tailwindcss'` + `@plugin "daisyui" { themes: light --default, dim --prefersdark; }`). There are **no CSS/SCSS modules**; SCSS exists only for the vendored TipTap design tokens in [src/styles/](src/styles/). Dark mode is a `.dark` class synced from the OS by [src/components/SystemThemeSync.tsx](src/components/SystemThemeSync.tsx).

## Directory map

```text
src/
  app/                    Next App Router: layout, / (welcome), /editor
  components/             App-wide shared UI, flat: ConfirmDialog, DeleteButton,
                          DragHandle, FormControls, SystemThemeSync, toast
  electron/               main.ts, windowState.ts, preload.cjs
  features/
    welcome/              WelcomeScreen, AppTitleBar, New/Open buttons, RecentFilesSection
    authoring/            The editor
      AuthoringScreen.tsx   reads ?path, loads XML, renders Sidebar + PanelRouter
      model/pageModel.ts    page types, PageCapabilities matrix, type conversion
      page-editors/         StandardPageEditor, QuizPageEditor, RichTextEditor, registry
      panels/               PanelRouter, SetupPanel, SectionPanel, PagePanel
      sidebar/              Sidebar, sidebarUtils, useSidebarDnD
      state/                AuthoringProvider, authoringReducer, authoringTypes
  lib/                    presentationValidation.ts, presentationPackage.ts
                          — platform-independent; filesystem is injected, keep it that way
  styles/                 _variables.scss, _keyframe-animations.scss (TipTap tokens)
  types/                  sbplus.ts (domain), global.d.ts (IPC contract), scss.d.ts
  vendor/tiptap/          VENDORED third-party — see below
```

`src/vendor/tiptap/**` is the TipTap "simple editor" template, copied in as-is. It uses kebab-case filenames, named exports, and `index.tsx` barrels — a deliberately different style from first-party code. **Do not restyle, reformat, or refactor it**, and do not treat its conventions as the project's.

There are **no barrel files in first-party code**. Import modules directly.

## Domain model

[src/types/sbplus.ts](src/types/sbplus.ts) is a direct TypeScript mirror of the `xml2js` shape of `sbplus.xml`, using the xml2js convention: `$` holds attributes, `_` holds CDATA/text.

```text
storybook { $: accent, pageImgFormat, splashImgFormat, mathjax, analytics, downloadableFileName
            setup { $.splashImg, title, subtitle, length, author, generalInfo }
            section[] { $.title, page[] } }
```

[src/features/authoring/model/pageModel.ts](src/features/authoring/model/pageModel.ts) is the domain core: the nine page types, their UI labels, the `PageCapabilities` matrix that drives which fields each editor renders, the four quiz subtypes, and `convertPageType()` / `convertQuizSubtype()`. **Add a page type or a per-type field here first**, then let the editors read from capabilities rather than branching on the type string.

XML I/O rules:

- Parsed with `parseStringPromise` (`explicitArray: false`, `preserveChildrenOrder`), rebuilt with `Builder` (`cdata: true`, 2-space pretty).
- Because `explicitArray: false` collapses single-element lists, `asArray()` guards appear throughout, and `normalizeStorybookXml()` must re-array `section`, `page`, `frame`, `marker`, `segment`, and `answer` before building. Skipping that silently corrupts one-item documents.

## State

Plain React `useReducer` + Context — no zustand, no redux.

- [state/AuthoringProvider.tsx](src/features/authoring/state/AuthoringProvider.tsx) — provider plus the `useAuthoring()` hook (throws outside the provider). Mounted in [src/app/editor/layout.tsx](src/app/editor/layout.tsx).
- [state/authoringReducer.ts](src/features/authoring/state/authoringReducer.ts) — pure immutable updates over the whole parsed XML tree.
- [state/authoringTypes.ts](src/features/authoring/state/authoringTypes.ts) — `AuthoringState` and a discriminated-union `AuthoringAction` (~28 variants). **Add new actions to the union first**; the reducer switch is exhaustive against it.
- Every mutating action sets `dirty: true`. Dirty state is mirrored to the main process (`editor:set-dirty`) to enable/disable the File → Save menu item.
- Toasts are imperative, not context-based: `showToast(...)` from [src/components/toast.tsx](src/components/toast.tsx).

## Adding an IPC channel

The contract lives in three places and all three must be edited together:

1. [src/types/global.d.ts](src/types/global.d.ts) — the `declare global { interface Window { electronAPI } }` block.
2. [src/electron/preload.cjs](src/electron/preload.cjs) — the `contextBridge` exposure.
3. [src/electron/main.ts](src/electron/main.ts) — the `ipcMain` handler.

## Gotchas

- **`preload.cjs` is hand-copied, not compiled.** [env-scripts/start-electron-dev.cjs](env-scripts/start-electron-dev.cjs) copies it into `dist-electron/electron/` on each start. Editing it mid-session does nothing until you restart the dev script.
- **The renderer cannot read `file://`** — it is served from the static-server origin. Asset previews go through the `presentation:get-asset-data-url` IPC call and come back as base64 data URLs.
- **`sharp` and `electron-default-menu` are declared dependencies but unused in `src/`.** `sharp` exists only for the `predist` electron-builder workaround; the menu is hand-built in `buildAppMenu()`. Don't "fix" this by wiring them up.
- **ESLint deliberately disables** `react-hooks/immutability`, `react-hooks/refs`, and `react-hooks/set-state-in-effect` (the `react-hooks-compiler-advisory-compat` block in [eslint.config.mjs](eslint.config.mjs)). Leave them off.
- **Export writes a directory, not an archive**, despite the app's name and the zip icon on the button.
- Help → About sends `menu:help-about` to the focused window, which opens [src/components/AboutModal.tsx](src/components/AboutModal.tsx). The welcome window has no menu bar, so it triggers the same modal from an About button. Check for Updates now lives inside that modal, and `app:check-for-updates` always returns `{ status: 'unsupported' }` — there is still no auto-update.
- No CI (`.github/` does not exist), no husky, no lint-staged, no Prettier, no `.editorconfig` — formatting is manual, so match the surrounding file.

## Conventions

- **Indentation: 4 spaces** in nearly all first-party files. A few entry files use 2 — match the file you are editing.
- Quotes lean single, especially under `features/authoring/**`; a few files use double. Match the file.
- `import type` for type-only imports (required by `isolatedModules`).
- Import order in practice: React/Next → third-party → `@/...` → relative `./` → `import type` last.
- `@/` for cross-feature imports; relative `./` for same-folder siblings.
- Naming: `PascalCase.tsx` components with a **default export**, `useCamelCase.ts` hooks, `camelCase.ts` for non-component modules.
- `'use client'` on every interactive component and hook. Only the four files under [src/app/](src/app/) are server components — and since the build is a static export, everything is prerendered anyway.
- Prefer daisyUI semantic classes (`bg-base-200`, `input input-md`, `alert alert-error`) over raw Tailwind utilities where one exists.
- Keep [src/lib/](src/lib/) free of Electron and Node-specific imports — validation takes an injected `ValidationFileSystem` so it stays testable.
