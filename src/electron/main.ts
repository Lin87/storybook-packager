import { app, BrowserWindow, ipcMain, dialog } from 'electron';

app.setName('storybook-packager');

import express from 'express';
import http from 'http';
import getPort from 'get-port';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import type { StorybookXml } from '../types/sbplus';
import { loadWelcomeWindowState, saveWelcomeWindowState, loadEditorWindowState, saveEditorWindowState } from './windowState.js';

// Required to get __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.ELECTRON_START_URL;
console.log(`Running in ${isDev ? 'development' : 'production'} mode.`);

const recentFilePath: string = path.join(app.getPath('userData'), 'recent.json');

let welcomeWindow: BrowserWindow | null = null;
let staticServer: http.Server | null = null;
let staticPort: number;

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

        editorWindow.on('close', () => {
            saveEditorWindowState(editorWindow);
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
        saveWelcomeWindowState(welcomeWindow!);
    });
}

app.whenReady().then(async () => {
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
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
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

// Helper to create the presentation folder structure
function createPresentationFolders(basePath: string, title: string) {
    const assetsPath = path.join(basePath, 'assets');
    const subDirs = ['audio', 'video', 'images', 'html', 'pages'];

    fs.mkdirSync(assetsPath, { recursive: true });
    subDirs.forEach((dir) => fs.mkdirSync(path.join(assetsPath, dir), { recursive: true }));

    const xmlContent = `<?xml version="1.0" encoding="UTF-8" ?>
<storybook accent="#642667" pageImgFormat="jpg" splashImgFormat="jpg" mathjax="off">
  <setup splashImg="splash">
    <title>${title}</title>
    <author name="Author Name"></author>
  </setup>
  <section title="">
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
