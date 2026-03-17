import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';

app.setName('storybook-packager');

import express from 'express';
import http from 'http';
import getPort from 'get-port';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Builder, parseStringPromise } from 'xml2js';
import type { StorybookXml } from '../types/sbplus';
import { loadWelcomeWindowState, saveWelcomeWindowState, loadEditorWindowState, saveEditorWindowState } from './windowState.js';

// Required to get __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.ELECTRON_START_URL;
console.log(`Running in ${isDev ? 'development' : 'production'} mode.`);

const recentFilePath: string = path.join(app.getPath('userData'), 'recent.json');
const windowDirty = new Map<number, boolean>(); // track dirty state per window

let welcomeWindow: BrowserWindow | null = null;
let staticServer: http.Server | null = null;
let staticPort: number;
let lastClosedWindow: 'editor' | 'welcome' | null = null;
const allowWindowClose = new Set<number>();
let isQuitting = false;

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
            submenu: [
                {
                    label: 'About',
                    click: async () => {
                        await dialog.showMessageBox({
                            type: 'info',
                            title: 'About',
                            message: 'Storybook Packager',
                            detail: 'About is not implemented yet.',
                        });
                    },
                },
                {
                    label: 'Check for Updates',
                    click: async () => {
                        await dialog.showMessageBox({
                            type: 'info',
                            title: 'Check for Updates',
                            message: 'Check for Updates is not implemented yet.',
                        });
                    },
                },
            ],
        },
    ];

    // macOS app menu (required for proper behavior)
    if (process.platform === 'darwin') {
        template.unshift({
            role: 'appMenu',
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

    ipcMain.on('window:set-title', (event, payload: { title: string; edited?: boolean }) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        const baseTitle = payload.title || 'Storybook Packager';
        const edited = Boolean(payload.edited);

        // Windows/Linux convention: prefix an asterisk for unsaved changes
        // macOS convention: NO asterisk; use the native edited dot instead
        const fullTitle = process.platform === 'darwin' ? baseTitle : `${edited ? '* ' : ''}${baseTitle}`;

        win.setTitle(fullTitle);

        // macOS "document edited" indicator (dot in titlebar)
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
            const importedPath = await importPresentationAsset(payload);
            return { success: true, path: importedPath };
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

app.whenReady().then(async () => {
    app.on('browser-window-focus', () => buildAppMenu());
    app.on('browser-window-blur', () => buildAppMenu());

    registerIpcHandlers(); // IPCs must be ready before window launches
    if (!isDev) {
        staticPort = await startStaticServer(); // Only start Express server in prod mode
    }
    createWelcomeWindow();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWelcomeWindow();
    }
});

app.on('window-all-closed', () => {
    if (isQuitting) {
        return;
    }

    if (process.platform !== 'darwin') {
        if (lastClosedWindow === 'welcome') {
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

type ImportAssetPayload = {
    presentationPath: string;
    kind: 'page-image' | 'page-audio' | 'bundle-audio' | 'video';
    sourceName: string;
    imageFormat?: string;
    targetBaseName?: string;
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

async function importPresentationAsset(payload: ImportAssetPayload): Promise<string> {
    ensurePresentationFolders(payload.presentationPath);

    const sourceName = payload.sourceName.trim();
    if (!sourceName) {
        throw new Error('Enter a source name before importing an asset.');
    }

    const targetBaseName = payload.targetBaseName?.trim() || sourceName;

    let filters: Electron.FileFilter[] = [];
    let targetPath = '';
    let cleanupDirectory = '';
    let cleanupBaseName = '';

    if (payload.kind === 'page-image') {
        const imageFormat = (payload.imageFormat || 'jpg').toLowerCase();
        filters = [{ name: `${imageFormat.toUpperCase()} image`, extensions: [imageFormat] }];
        targetPath = path.join(payload.presentationPath, 'assets', 'pages', `${targetBaseName}.${imageFormat}`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'pages');
        cleanupBaseName = targetBaseName;
    } else if (payload.kind === 'page-audio') {
        filters = [{ name: 'MP3 audio', extensions: ['mp3'] }];
        targetPath = path.join(payload.presentationPath, 'assets', 'audio', `${sourceName}.mp3`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'audio');
        cleanupBaseName = sourceName;
    } else if (payload.kind === 'bundle-audio') {
        filters = [{ name: 'MP3 audio', extensions: ['mp3'] }];
        targetPath = path.join(payload.presentationPath, 'assets', 'audio', `${sourceName}-bundled.mp3`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'audio');
        cleanupBaseName = `${sourceName}-bundled`;
    } else {
        filters = [{ name: 'MP4 video', extensions: ['mp4'] }];
        targetPath = path.join(payload.presentationPath, 'assets', 'video', `${sourceName}.mp4`);
        cleanupDirectory = path.join(payload.presentationPath, 'assets', 'video');
        cleanupBaseName = sourceName;
    }

    const result = await dialog.showOpenDialog({
        title: 'Select a source file',
        properties: ['openFile'],
        filters,
    });

    if (result.canceled || result.filePaths.length === 0) {
        throw new Error('Import canceled.');
    }

    removeManagedFilesByBaseName(cleanupDirectory, cleanupBaseName);
    fs.copyFileSync(result.filePaths[0], targetPath);
    return targetPath;
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
