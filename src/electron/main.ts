import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';

app.setName('storybook-packager');

import express from 'express';
import http from 'http';
import getPort from 'get-port';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { Builder, parseStringPromise } from 'xml2js';
import type { StorybookXml } from '../types/sbplus';
import type { UpdateCheckResult } from '../types/updates';
import { loadWelcomeWindowState, saveWelcomeWindowState, loadEditorWindowState, saveEditorWindowState } from './windowState.js';
import { hasAcceptedCurrentLegal, saveLegalAcceptance } from './legalAcceptance.js';
import { LEGAL_DOC_VERSION } from '../lib/legal.js';
import type { LegalState } from '../lib/legal.js';
import { validatePresentation } from '../lib/presentationValidation.js';
import type { ValidationItem, ValidationResult, ValidationSeverity } from '../lib/presentationValidation.js';
import { exportPresentationPackageToDirectory, zipPresentationPackageDirectory } from '../lib/presentationPackage.js';

// Required to get __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.ELECTRON_START_URL;
console.log(`Running in ${isDev ? 'development' : 'production'} mode.`);

const recentFilePath: string = path.join(app.getPath('userData'), 'recent.json');
const windowDirty = new Map<number, boolean>(); // track dirty state per window

let welcomeWindow: BrowserWindow | null = null;
let firstRunWindow: BrowserWindow | null = null;
let staticServer: http.Server | null = null;
let staticPort: number;
let lastClosedWindow: 'editor' | 'welcome' | 'first-run' | null = null;
const allowWindowClose = new Set<number>();
let isQuitting = false;

let cachedVersion: string | null = null;

/**
 * Reads the `version` field from package.json, so bumping that one field is all
 * it takes for the About modal to report a new version.
 */
function getPackageVersion(): string {
    if (cachedVersion) return cachedVersion;

    const candidates = [
        path.join(app.getAppPath(), 'package.json'), // packaged
        path.join(__dirname, '..', '..', 'package.json'), // dev
    ];

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as { version?: string };
            if (typeof parsed.version === 'string' && parsed.version) {
                cachedVersion = parsed.version;
                return cachedVersion;
            }
        } catch {
            // Try the next candidate.
        }
    }

    return 'unknown';
}

function aboutMenuItem(): Electron.MenuItemConstructorOptions {
    return {
        label: 'About Storybook Packager',
        click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            win.webContents.send('menu:help-about');
        },
    };
}

function buildAppMenu() {
    const editorEnabled = isEditorFocused();
    const editorDirty = isFocusedEditorDirty();

    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    enabled: editorEnabled && editorDirty,
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow();
                        if (!win) return;
                        win.webContents.send('menu:file-save');
                    },
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    enabled: editorEnabled,
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow();
                        if (!win || !isEditorWindow(win)) return;
                        win.webContents.send('menu:file-save-as');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Close',
                    accelerator: 'CmdOrCtrl+W',
                    enabled: editorEnabled,
                    click: () => {
                        const win = BrowserWindow.getFocusedWindow();
                        if (!win || !isEditorWindow(win)) return;

                        // Closing the editor will return to the welcome screen
                        // when it's the last editor window.
                        win.close();
                    },
                },
            ],
        },

        { role: 'editMenu' },

        {
            label: 'View',
            submenu: [{ role: 'resetZoom', label: 'Actual Size' }, { role: 'zoomIn' }, { role: 'zoomOut' }],
        },

        {
            label: 'Help',
            submenu: [aboutMenuItem()],
        },
    ];

    // macOS app menu (required for proper behavior).
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.name,
            submenu: [
                aboutMenuItem(),
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function isEditorWindow(win: BrowserWindow | null): boolean {
    if (!win || win.isDestroyed()) return false;

    try {
        const url = win.webContents.getURL();
        return url.includes('/editor');
    } catch {
        return false;
    }
}

function isEditorFocused(): boolean {
    return isEditorWindow(BrowserWindow.getFocusedWindow());
}

function isFocusedEditorDirty(): boolean {
    const win = BrowserWindow.getFocusedWindow();
    if (!isEditorWindow(win)) return false;
    return windowDirty.get(win!.webContents.id) === true;
}

async function startStaticServer(): Promise<number> {
    const staticPath = path.join(process.cwd(), 'out');

    if (!fs.existsSync(staticPath)) {
        console.error("❌ The 'out' directory does not exist. Run `npm run build:prod` first.");
        app.quit(); // refers to Electron's app
        return 0;
    }

    staticPort = await getPort({ port: makeRange(3005, 3999) });

    staticServer = express()
        .use(express.static(staticPath))
        .listen(staticPort, '127.0.0.1', () => {
            console.log(`Static export served at http://127.0.0.1:${staticPort}`);
        });

    return staticPort;
}

// Register IPC handlers here
function registerIpcHandlers() {
    ipcMain.handle('app:get-platform', () => {
        return process.platform;
    });

    ipcMain.handle('app:get-version', () => {
        return getPackageVersion();
    });

    // Placeholder until the auto-update phase: the renderer already renders every
    // UpdateCheckResult branch, so only this handler needs to change later.
    ipcMain.handle('app:check-for-updates', (): UpdateCheckResult => {
        return { status: 'unsupported' };
    });

    ipcMain.handle('legal:get-state', (): LegalState => {
        return { accepted: hasAcceptedCurrentLegal(), version: LEGAL_DOC_VERSION };
    });

    ipcMain.handle('legal:accept', () => {
        saveLegalAcceptance(getPackageVersion());

        // Open the welcome window first so 'window-all-closed' never fires while
        // the first-run window is on its way out.
        createWelcomeWindow();

        if (firstRunWindow && !firstRunWindow.isDestroyed()) {
            firstRunWindow.close();
        }
    });

    ipcMain.on('legal:decline', () => {
        app.quit();
    });

    ipcMain.on('window:set-title', (event, payload: { title: string; edited?: boolean }) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        const baseTitle = payload.title || 'Storybook Packager';
        const edited = Boolean(payload.edited);

        // Windows/Linux convention: prefix an asterisk for unsaved changes
        // macOS convention: NO asterisk; use the native edited dot instead
        const fullTitle = process.platform === 'darwin' ? baseTitle : `${edited ? '* ' : ''}${baseTitle}`;

        win.setTitle(fullTitle);

        // macOS "document edited" indicator (dot in title bar)
        if (process.platform === 'darwin') {
            win.setDocumentEdited(edited);
        }
    });

    ipcMain.on('window:minimize', () => {
        BrowserWindow.getFocusedWindow()?.minimize();
    });

    ipcMain.on('window:close', () => {
        BrowserWindow.getFocusedWindow()?.close();
    });

    ipcMain.handle('create-new-presentation', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Choose a location for the new presentation',
            properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) return null;

        const targetDir = result.filePaths[0];
        const title = path.basename(targetDir);

        try {
            createPresentationFolders(targetDir, title);
            saveRecent(targetDir);
            return targetDir;
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-existing-presentation', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Open Existing Presentation',
            properties: ['openDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) return null;

        const selectedPath = result.filePaths[0];
        const xmlPath = path.join(selectedPath, 'assets', 'sbplus.xml');

        if (!fs.existsSync(xmlPath)) {
            return { error: 'This folder does not contain a valid Storybook+ presentation.' };
        }

        saveRecent(selectedPath);
        return selectedPath;
    });

    ipcMain.handle('get-recent', () => {
        if (fs.existsSync(recentFilePath)) {
            const contents = fs.readFileSync(recentFilePath, 'utf-8');
            const recentPaths: string[] = JSON.parse(contents);
            const validPaths = recentPaths.filter((p) => {
                try {
                    return fs.existsSync(p) && fs.statSync(p).isDirectory();
                } catch {
                    return false;
                }
            });

            if (validPaths.length !== recentPaths.length) {
                fs.writeFileSync(recentFilePath, JSON.stringify(validPaths));
            }

            return validPaths;
        }

        return [];
    });

    ipcMain.handle('open-editor-window', (_event, presentationPath: string) => {
        const savedState = loadEditorWindowState();

        const editorWindow = new BrowserWindow({
            show: false, // don't show immediately
            width: savedState.width,
            height: savedState.height,
            minWidth: 1024,
            minHeight: 768,
            x: savedState.x,
            y: savedState.y,
            backgroundColor: '#1D232A',
            title: 'Storybook Editor',
            icon: resolveAsset('icons/icon.png'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        const wcId = editorWindow.webContents.id;

        if (savedState.fullscreen) {
            editorWindow.setFullScreen(true);
        } else if (savedState.maximized) {
            editorWindow.maximize();
        }

        if (!isDev && !staticPort) {
            console.error('Editor URL could not be resolved: staticPort is undefined.');
            return;
        }

        const editorURL = isDev ? `${process.env.ELECTRON_START_URL}/editor?path=${encodeURI(presentationPath)}` : `http://localhost:${staticPort}/editor?path=${encodeURI(presentationPath)}`;

        editorWindow.loadURL(editorURL);

        editorWindow.once('ready-to-show', () => {
            editorWindow.show(); // only show when fully ready
        });

        editorWindow.on('close', async (event) => {
            lastClosedWindow = 'editor';

            const dirty = windowDirty.get(wcId) === true;

            if (allowWindowClose.has(wcId)) {
                allowWindowClose.delete(wcId);

                if (!editorWindow.isDestroyed()) {
                    try {
                        saveEditorWindowState(editorWindow);
                    } catch (e) {
                        console.warn('Failed to save editor window state on close:', e);
                    }
                }

                return;
            }

            if (!dirty) {
                if (!editorWindow.isDestroyed()) {
                    try {
                        saveEditorWindowState(editorWindow);
                    } catch (e) {
                        console.warn('Failed to save editor window state on close:', e);
                    }
                }

                return;
            }

            event.preventDefault();

            const action = await promptForUnsavedChanges(editorWindow);

            if (action === 'cancel') {
                isQuitting = false;
                return;
            }

            if (action === 'discard') {
                windowDirty.set(wcId, false);
                buildAppMenu();
                allowWindowClose.add(wcId);
                editorWindow.close();
                return;
            }

            const saveResult = await requestRendererSave(editorWindow, 'menu:file-save', 'close');

            if (saveResult?.success) {
                windowDirty.set(wcId, false);
                buildAppMenu();
                allowWindowClose.add(wcId);
                editorWindow.close();
                return;
            }

            await dialog.showMessageBox(editorWindow, {
                type: 'error',
                title: 'Save Failed',
                message: 'The presentation could not be saved.',
                detail: saveResult?.error ?? 'Unknown save error.',
            });
            isQuitting = false;
        });

        editorWindow.on('closed', () => {
            windowDirty.delete(wcId);
            allowWindowClose.delete(wcId);

            // On macOS, closing the last window does NOT trigger window-all-closed quitting logic.
            // So if no windows remain, reopen Welcome.
            if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
                createWelcomeWindow();
            }
        });

        // close the welcome window
        if (welcomeWindow && !welcomeWindow.isDestroyed()) {
            welcomeWindow.close();
            welcomeWindow = null;
        }
    });

    ipcMain.handle('load-presentation-data', async (_event, presentationPath: string) => {
        try {
            const xmlPath = path.join(presentationPath, 'assets', 'sbplus.xml');

            const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
            const result = (await parseStringPromise(xmlContent, {
                explicitArray: false, // <- prevent arrays unless needed
                trim: true, // remove extra whitespace
                explicitCharkey: false, // do not use '_' wrapper unless needed
                mergeAttrs: false, // keep attributes inside '$'
                preserveChildrenOrder: true, // needed for consistent reconstruction
                explicitRoot: true, // keep <storybook> root
                charsAsChildren: false, // cleaner structure
                explicitChildren: false, // do not create a 'children' object
                includeWhiteChars: false, // remove unnecessary whitespace
            })) as StorybookXml;

            return { success: true, data: result };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:perform-save', async (_event, payload: SavePayload) => {
        try {
            writePresentationXml(payload.presentationPath, payload.xml);
            saveRecent(payload.presentationPath);
            return { success: true, path: payload.presentationPath };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:perform-save-as', async (_event, payload: SavePayload) => {
        const result = await dialog.showOpenDialog({
            title: 'Choose a location for the presentation',
            properties: ['openDirectory', 'createDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const targetPath = result.filePaths[0];

        try {
            ensurePresentationFolders(targetPath);
            writePresentationXml(targetPath, payload.xml);
            saveRecent(targetPath);
            return { success: true, path: targetPath };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:import-asset', async (_event, payload: ImportAssetPayload) => {
        try {
            const imported = await importPresentationAsset(payload);
            return { success: true, ...imported };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:get-asset-data-url', async (_event, payload: AssetDataPayload) => {
        try {
            return { success: true, dataUrl: readAssetAsDataUrl(payload.filePath) };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:validate', async (_event, payload: SavePayload) => {
        try {
            return {
                success: true,
                result: validatePresentation(payload.xml, {
                    fileSystem: createPresentationFileSystem(payload.presentationPath),
                }),
            };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('presentation:export-package', async (_event, payload: ExportPayload) => {
        const selectedPath = payload.targetPath ?? await selectExportZipPath(payload.presentationPath);

        if (!selectedPath) {
            return null;
        }

        const targetPath = ensureZipExtension(selectedPath);
        const stagingPath = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-package-'));

        try {
            exportPresentationPackageToDirectory({
                sourcePath: payload.presentationPath,
                targetPath: stagingPath,
                xmlContent: buildStorybookXml(payload.xml),
            });
            const validation = validatePresentation(payload.xml, {
                fileSystem: createPresentationFileSystem(stagingPath),
            });

            await zipPresentationPackageDirectory(stagingPath, targetPath);
            saveRecent(payload.presentationPath);
            return {
                success: true,
                path: targetPath,
                validation,
            };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        } finally {
            fs.rmSync(stagingPath, { recursive: true, force: true });
        }
    });

    ipcMain.handle('presentation:show-validation-results', async (event, payload: ValidationResultsPayload) => {
        try {
            openValidationResultsWindow(payload, BrowserWindow.fromWebContents(event.sender));
            return { success: true };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('editor:set-dirty', (event, dirty: boolean) => {
        windowDirty.set(event.sender.id, Boolean(dirty));
        buildAppMenu(); // re-evaluate enabled/disabled state
    });
}

function createWelcomeWindow() {
    const pos = loadWelcomeWindowState();
    const width: number = 800;
    const height: number = 450;

    welcomeWindow = new BrowserWindow({
        width: width,
        height: height,
        x: pos.x,
        y: pos.y,
        frame: false,
        backgroundMaterial: 'mica',
        visualEffectState: 'active',
        vibrancy: 'under-window',
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 12, y: 10 },
        resizable: false,
        icon: resolveAsset('icons/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'), // Make sure this path is correct
            contextIsolation: true,
            nodeIntegration: false, // never use true unless absolutely necessary
        },
    });

    const startURL = isDev ? process.env.ELECTRON_START_URL! : `http://localhost:${staticPort}/`;

    welcomeWindow.setMenuBarVisibility(false);
    welcomeWindow.loadURL(startURL);

    welcomeWindow.on('close', () => {
        lastClosedWindow = 'welcome';

        if (welcomeWindow && !welcomeWindow.isDestroyed()) {
            try {
                saveWelcomeWindowState(welcomeWindow);
            } catch (e) {
                console.warn('Failed to save welcome window state on close:', e);
            }
        }
    });
}

/**
 * Shown instead of the welcome window until the current Terms and Privacy Policy
 * have been accepted. Roomier and resizable than the welcome window because the
 * user has to actually read the documents here.
 */
function createFirstRunWindow() {
    firstRunWindow = new BrowserWindow({
        width: 760,
        height: 680,
        minWidth: 640,
        minHeight: 520,
        frame: false,
        backgroundMaterial: 'mica',
        visualEffectState: 'active',
        vibrancy: 'under-window',
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 12, y: 10 },
        icon: resolveAsset('icons/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    const firstRunURL = isDev ? `${process.env.ELECTRON_START_URL}/first-run/` : `http://localhost:${staticPort}/first-run/`;

    firstRunWindow.setMenuBarVisibility(false);
    firstRunWindow.loadURL(firstRunURL);

    firstRunWindow.on('close', () => {
        lastClosedWindow = 'first-run';
    });

    firstRunWindow.on('closed', () => {
        firstRunWindow = null;
    });
}

/** Gates the app behind the agreement screen until the current documents are accepted. */
function createStartupWindow() {
    if (hasAcceptedCurrentLegal()) {
        createWelcomeWindow();
    } else {
        createFirstRunWindow();
    }
}

app.whenReady().then(async () => {
    app.on('browser-window-focus', () => buildAppMenu());
    app.on('browser-window-blur', () => buildAppMenu());

    registerIpcHandlers(); // IPCs must be ready before window launches
    if (!isDev) {
        staticPort = await startStaticServer(); // Only start Express server in prod mode
    }
    createStartupWindow();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createStartupWindow();
    }
});

app.on('window-all-closed', () => {
    if (isQuitting) {
        return;
    }

    if (process.platform !== 'darwin') {
        // Dismissing the agreement screen without accepting exits the app rather
        // than falling through to the welcome window.
        if (lastClosedWindow === 'welcome' || lastClosedWindow === 'first-run') {
            app.quit();
        } else {
            createWelcomeWindow();
        }
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

app.on('will-quit', () => {
    if (staticServer) {
        staticServer.close(() => {
            console.log('🧹 Static server shut down.');
        });
    }
});

/**** HELPERS ****/

function makeRange(min: number, max: number): number[] {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

type SavePayload = {
    presentationPath: string;
    xml: StorybookXml;
};

type ExportPayload = SavePayload & {
    targetPath?: string;
};

type ValidationResultsPayload = {
    result: ValidationResult;
    presentationTitle?: string;
};

type ImportAssetPayload = {
    presentationPath: string;
    kind: 'page-image' | 'page-audio' | 'bundle-audio' | 'video' | 'splash-image' | 'quiz-image' | 'quiz-audio' | 'html';
    sourceName?: string;
    imageFormat?: string;
    targetBaseName?: string;
};

type ImportAssetResult = {
    path: string;
    originalPath: string;
    originalBaseName: string;
    targetBaseName: string;
};

type AssetDataPayload = {
    filePath: string;
};

type SaveResult = { success: true; path: string } | { success: false; error: string } | null;

type SaveReason = 'menu' | 'close';

function asArray<T>(value: T | T[] | undefined): T[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function cloneStorybookXml(xml: StorybookXml): StorybookXml {
    if (typeof structuredClone === 'function') {
        return structuredClone(xml);
    }

    return JSON.parse(JSON.stringify(xml)) as StorybookXml;
}

function normalizeStorybookXml(xml: StorybookXml): StorybookXml {
    const next = cloneStorybookXml(xml);
    const storybook = next.storybook;

    storybook.section = asArray(storybook.section).map((section) => ({
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

function buildStorybookXml(xml: StorybookXml): string {
    const builder = new Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' },
        cdata: true,
    });

    return builder.buildObject(normalizeStorybookXml(xml));
}

async function promptForUnsavedChanges(win: BrowserWindow): Promise<'save' | 'discard' | 'cancel'> {
    const result = await dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Unsaved Changes',
        message: 'Do you want to save your changes before closing?',
        detail: 'If you do not save, your changes will be lost.',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
    });

    if (result.response === 0) return 'save';
    if (result.response === 1) return 'discard';
    return 'cancel';
}

function requestRendererSave(win: BrowserWindow, channel: 'menu:file-save' | 'menu:file-save-as', reason: SaveReason): Promise<SaveResult> {
    return new Promise((resolve) => {
        const requestId = `${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const responseChannel = `${channel}:result:${requestId}`;

        const timeout = setTimeout(() => {
            ipcMain.removeAllListeners(responseChannel);
            resolve({ success: false, error: 'Timed out waiting for the renderer save handler.' });
        }, 30000);

        ipcMain.once(responseChannel, (_event, result: SaveResult) => {
            clearTimeout(timeout);
            resolve(result);
        });

        if (win.isDestroyed()) {
            clearTimeout(timeout);
            ipcMain.removeAllListeners(responseChannel);
            resolve({ success: false, error: 'The editor window is no longer available.' });
            return;
        }

        win.webContents.send(channel, { requestId, reason });
    });
}

function ensurePresentationFolders(basePath: string) {
    const assetsPath = path.join(basePath, 'assets');
    const subDirs = ['audio', 'video', 'images', 'html', 'pages'];

    fs.mkdirSync(assetsPath, { recursive: true });
    subDirs.forEach((dir) => fs.mkdirSync(path.join(assetsPath, dir), { recursive: true }));
}

function fileBaseName(fileName: string): string {
    return path.parse(fileName).name;
}

function withExtension(fileName: string, extension: string): string {
    return path.extname(fileName) ? fileName : `${fileName}.${extension}`;
}

function normalizeExtension(extension: string | undefined, fallback: string): string {
    return (extension?.trim() || fallback).replace(/^\.+/, '').toLowerCase();
}

function readAssetAsDataUrl(filePath: string): string {
    const content = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const mimeType =
        extension === '.jpg' || extension === '.jpeg'
            ? 'image/jpeg'
            : extension === '.png'
                ? 'image/png'
                : extension === '.gif'
                    ? 'image/gif'
                    : extension === '.webp'
                        ? 'image/webp'
                        : extension === '.mp3'
                            ? 'audio/mpeg'
                            : extension === '.wav'
                                ? 'audio/wav'
                                : extension === '.mp4'
                                    ? 'video/mp4'
                                    : 'application/octet-stream';

    return `data:${mimeType};base64,${content.toString('base64')}`;
}

function createPresentationFileSystem(presentationPath: string) {
    return {
        exists: (relativePath: string) => fs.existsSync(path.join(presentationPath, relativePath)),
        listFiles: (relativeDirectory: string) => {
            const directoryPath = path.join(presentationPath, relativeDirectory);
            if (!fs.existsSync(directoryPath)) return [];

            return fs
                .readdirSync(directoryPath, { withFileTypes: true })
                .filter((entry) => entry.isFile())
                .map((entry) => entry.name);
        },
    };
}

function openValidationResultsWindow(payload: ValidationResultsPayload, parentWindow: BrowserWindow | null) {
    const presentationTitle = payload.presentationTitle?.trim() || 'Untitled';
    const windowTitle = `Validation Results - ${presentationTitle}`;
    const validationWindow = new BrowserWindow({
        width: 780,
        height: 620,
        minWidth: 520,
        minHeight: 420,
        title: windowTitle,
        backgroundColor: '#111827',
        autoHideMenuBar: true,
        icon: resolveAsset('icons/icon.png'),
        parent: parentWindow ?? undefined,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    validationWindow.removeMenu();
    validationWindow.setMenuBarVisibility(false);
    validationWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildValidationResultsHtml(payload.result, presentationTitle, windowTitle))}`);
    validationWindow.webContents.on('page-title-updated', (event) => {
        event.preventDefault();
        validationWindow.setTitle(windowTitle);
    });
    validationWindow.webContents.once('did-finish-load', () => {
        validationWindow.setTitle(windowTitle);
    });
}

function buildValidationResultsHtml(result: ValidationResult, presentationTitle: string, windowTitle: string) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(windowTitle)}</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, Helvetica, sans-serif; background: #111827; color: #e5e7eb; }
    body { margin: 0; }
    main { padding: 20px; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    h1 { font-size: 20px; line-height: 1.2; margin: 0; font-weight: 700; }
    .title { color: #9ca3af; font-size: 13px; margin-top: 5px; overflow-wrap: anywhere; }
    h2 { font-size: 13px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0; }
    .summary { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { border-radius: 4px; padding: 5px 8px; font-size: 12px; font-weight: 700; }
    .error { color: #fecaca; background: #7f1d1d; }
    .warning { color: #fde68a; background: #78350f; }
    .info { color: #bfdbfe; background: #1e3a8a; }
    .group { border-top: 1px solid #374151; padding-top: 4px; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
    li { background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 10px 12px; }
    .message { font-size: 13px; line-height: 1.35; }
    .meta { color: #9ca3af; font-size: 12px; margin-top: 5px; }
    .empty { color: #9ca3af; font-size: 13px; margin-top: 24px; }
    code { color: #c4b5fd; font-family: Consolas, Monaco, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Validation Results</h1>
        <div class="title">${escapeHtml(presentationTitle)}</div>
      </div>
      <div class="summary">
        <span class="chip error">${result.summary.errors} Errors</span>
        <span class="chip warning">${result.summary.warnings} Warnings</span>
        <span class="chip info">${result.summary.info} Info</span>
      </div>
    </header>
    ${buildValidationGroupHtml('Errors', 'error', result.items)}
    ${buildValidationGroupHtml('Warnings', 'warning', result.items)}
    ${buildValidationGroupHtml('Info', 'info', result.items)}
  </main>
</body>
</html>`;
}

function buildValidationGroupHtml(title: string, severity: ValidationSeverity, items: ValidationItem[]) {
    const matchingItems = items.filter((item) => item.severity === severity);
    if (matchingItems.length === 0) return '';

    return `<section class="group">
  <h2 class="${severity}">${escapeHtml(title)}</h2>
  <ul>
    ${matchingItems.map(buildValidationItemHtml).join('\n    ')}
  </ul>
</section>`;
}

function buildValidationItemHtml(item: ValidationItem) {
    const location = formatValidationLocation(item);
    const target = item.target ? `<div class="meta">Target: <code>${escapeHtml(item.target)}</code></div>` : '';
    const locationHtml = location ? `<div class="meta">${escapeHtml(location)}</div>` : '';

    return `<li>
  <div class="message">${escapeHtml(item.message)}</div>
  ${locationHtml}
  ${target}
</li>`;
}

function formatValidationLocation(item: ValidationItem) {
    const location = item.location;
    if (!location) return '';

    const section = location.sectionTitle ? location.sectionTitle : location.sectionIndex !== undefined ? `Section ${location.sectionIndex + 1}` : '';
    const page = location.pageTitle ? location.pageTitle : location.pageIndex !== undefined ? `Page ${location.pageIndex + 1}` : '';

    return [section, page].filter(Boolean).join(' / ');
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function selectExportZipPath(presentationPath: string) {
    const result = await dialog.showSaveDialog({
        title: 'Export Zip Package',
        defaultPath: `${path.basename(presentationPath)}.zip`,
        filters: [{ name: 'Zip archives', extensions: ['zip'] }],
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    return result.filePath;
}

function ensureZipExtension(filePath: string) {
    return path.extname(filePath).toLowerCase() === '.zip' ? filePath : `${filePath}.zip`;
}

function removeManagedFilesByBaseName(directory: string, baseName: string) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isFile()) continue;

        const parsed = path.parse(entry.name);
        if (parsed.name === baseName) {
            fs.unlinkSync(path.join(directory, entry.name));
        }
    }
}

async function importPresentationAsset(payload: ImportAssetPayload): Promise<ImportAssetResult> {
    ensurePresentationFolders(payload.presentationPath);

    const sourceName = payload.sourceName?.trim() ?? '';
    const targetBaseName = payload.targetBaseName?.trim() ?? '';

    let filters: Electron.FileFilter[] = [];

    if (payload.kind === 'page-image') {
        const imageFormat = normalizeExtension(payload.imageFormat, 'jpg');
        filters = [{ name: `${imageFormat.toUpperCase()} image`, extensions: [imageFormat] }];
    } else if (payload.kind === 'splash-image') {
        const imageFormat = normalizeExtension(payload.imageFormat, 'jpg');
        filters = [{ name: `${imageFormat.toUpperCase()} image`, extensions: [imageFormat] }];
    } else if (payload.kind === 'quiz-image') {
        const quizImageName = targetBaseName || sourceName;
        if (!quizImageName || !path.extname(quizImageName)) {
            throw new Error('Enter an image filename with an extension before importing a quiz image.');
        }
        filters = [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }];
    } else if (payload.kind === 'quiz-audio') {
        const quizAudioName = targetBaseName || sourceName;
        if (!quizAudioName || !path.extname(quizAudioName)) {
            throw new Error('Enter an audio filename with an extension before importing quiz audio.');
        }
        filters = [{ name: 'Audio', extensions: ['mp3', 'wav'] }];
    } else if (payload.kind === 'page-audio') {
        if (!sourceName) {
            throw new Error('Enter a source name before importing an asset.');
        }
        filters = [{ name: 'MP3 audio', extensions: ['mp3'] }];
    } else if (payload.kind === 'bundle-audio') {
        if (!sourceName) {
            throw new Error('Enter a source name before importing an asset.');
        }
        filters = [{ name: 'MP3 audio', extensions: ['mp3'] }];
    } else if (payload.kind === 'video') {
        if (!sourceName) {
            throw new Error('Enter a source name before importing an asset.');
        }
        filters = [{ name: 'MP4 video', extensions: ['mp4'] }];
    } else {
        if (!sourceName) {
            throw new Error('Enter a source name before importing an asset.');
        }
        filters = [{ name: 'HTML', extensions: ['html', 'htm'] }];
    }

    const result = await dialog.showOpenDialog({
        title: 'Select a source file',
        properties: ['openFile'],
        filters,
    });

    if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Import canceled.');
    }

    const originalPath = result.filePaths[0];
    const originalBaseName = fileBaseName(originalPath);
    const effectiveTargetBaseName = targetBaseName || sourceName || originalBaseName;
    let targetPath = '';
    let cleanupDirectory = '';
    let cleanupBaseName = '';

    if (payload.kind === 'page-image') {
        const imageFormat = normalizeExtension(payload.imageFormat, 'jpg');
        targetPath = path.join(payload.presentationPath, 'assets', 'pages', `${effectiveTargetBaseName}.${imageFormat}`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'pages');
        cleanupBaseName = effectiveTargetBaseName;
    } else if (payload.kind === 'splash-image') {
        const imageFormat = normalizeExtension(payload.imageFormat, 'jpg');
        targetPath = path.join(payload.presentationPath, 'assets', `splash.${imageFormat}`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets');
        cleanupBaseName = 'splash';
    } else if (payload.kind === 'quiz-image') {
        targetPath = path.join(payload.presentationPath, 'assets', 'images', effectiveTargetBaseName);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'images');
        cleanupBaseName = fileBaseName(effectiveTargetBaseName);
    } else if (payload.kind === 'quiz-audio') {
        targetPath = path.join(payload.presentationPath, 'assets', 'audio', effectiveTargetBaseName);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'audio');
        cleanupBaseName = fileBaseName(effectiveTargetBaseName);
    } else if (payload.kind === 'page-audio') {
        targetPath = path.join(payload.presentationPath, 'assets', 'audio', `${sourceName}.mp3`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'audio');
        cleanupBaseName = sourceName;
    } else if (payload.kind === 'bundle-audio') {
        targetPath = path.join(payload.presentationPath, 'assets', 'audio', `${sourceName}-bundled.mp3`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'audio');
        cleanupBaseName = `${sourceName}-bundled`;
    } else if (payload.kind === 'video') {
        targetPath = path.join(payload.presentationPath, 'assets', 'video', `${sourceName}.mp4`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'video');
        cleanupBaseName = sourceName;
    } else {
        targetPath = path.join(payload.presentationPath, 'assets', 'html', withExtension(effectiveTargetBaseName, 'html'));
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'html');
        cleanupBaseName = fileBaseName(effectiveTargetBaseName);
    }

    removeManagedFilesByBaseName(cleanupDirectory, cleanupBaseName);
    fs.copyFileSync(originalPath, targetPath);

    return {
        path: targetPath,
        originalPath,
        originalBaseName,
        targetBaseName: effectiveTargetBaseName,
    };
}

function writePresentationXml(basePath: string, xml: StorybookXml) {
    ensurePresentationFolders(basePath);
    fs.writeFileSync(path.join(basePath, 'assets', 'sbplus.xml'), buildStorybookXml(xml), 'utf-8');
}

// Helper to create the presentation folder structure
function createPresentationFolders(basePath: string, title: string) {
    const assetsPath = path.join(basePath, 'assets');
    ensurePresentationFolders(basePath);

    const xmlContent = `<?xml version="1.0" encoding="UTF-8" ?>
<storybook accent="#642667" pageImgFormat="jpg" splashImgFormat="jpg" mathjax="off">
  <setup splashImg="splash">
    <title>${title}</title>
    <author name="Author Name"></author>
  </setup>
  <section title="">
    <page type="image" src="Page1" title="Page 1">
      <note />
      <description />
    </page>
  </section>
</storybook>`;

    fs.writeFileSync(path.join(assetsPath, 'sbplus.xml'), xmlContent, 'utf-8');
}

function resolveAsset(file: string) {
    return app.isPackaged ? path.join(process.resourcesPath, 'assets', file) : path.join(__dirname, '../../public', file);
}

function loadRecent(): string[] {
    if (fs.existsSync(recentFilePath)) {
        return JSON.parse(fs.readFileSync(recentFilePath, 'utf-8'));
    }
    return [];
}

function saveRecent(pathToAdd: string) {
    const recent = loadRecent();
    const updated = [pathToAdd, ...recent.filter((p) => p !== pathToAdd)];
    fs.writeFileSync(recentFilePath, JSON.stringify(updated.slice(0, 10)), 'utf-8');
}
