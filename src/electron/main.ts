import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseStringPromise } from "xml2js";
import type { StorybookXml } from "../types/sbplus";

app.setName("storybook-packager");

// Required to get __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recentFilePath = path.join(app.getPath("userData"), "recent.json");

let welcomeWindow: BrowserWindow | null = null;

// Helper to create the presentation folder structure
function createPresentationFolders(basePath: string, title: string) {
    const assetsPath = path.join(basePath, "assets");
    const subDirs = ["audio", "video", "images", "html", "pages"];

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

    fs.writeFileSync(path.join(assetsPath, "sbplus.xml"), xmlContent, "utf-8");
}

// Register IPC handlers here
function registerIpcHandlers() {
    ipcMain.on("window:minimize", () => {
        BrowserWindow.getFocusedWindow()?.minimize();
    });

    ipcMain.on("window:close", () => {
        BrowserWindow.getFocusedWindow()?.close();
    });

    ipcMain.handle("create-new-presentation", async () => {
        const result = await dialog.showOpenDialog({
            title: "Choose a location for the new presentation",
            properties: ["openDirectory", "createDirectory"],
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

    ipcMain.handle("get-recent", () => {
        if (fs.existsSync(recentFilePath)) {
            const contents = fs.readFileSync(recentFilePath, "utf-8");
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

    ipcMain.handle("open-editor-window", (_event, presentationPath: string) => {
        const editorWindow = new BrowserWindow({
            width: 1024,
            height: 768,
            title: "Storybook Editor",
            icon: path.join(__dirname, "../public/icons/icon.png"),
            webPreferences: {
                preload: path.join(__dirname, "preload.cjs"),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        // Load editor.html or a route if using Next.js
        const editorURL = process.env.ELECTRON_START_URL ? `${process.env.ELECTRON_START_URL}/editor?path=${encodeURIComponent(presentationPath)}` : `file://${path.join(__dirname, "../out/editor.html")}`; // fallback for export

        editorWindow.loadURL(editorURL);

        // close the welcome window
        if (welcomeWindow && !welcomeWindow.isDestroyed()) {
            welcomeWindow.close();
            welcomeWindow = null;
        }
    });

    ipcMain.handle("load-presentation-data", async (_event, presentationPath: string) => {
        try {
            const xmlPath = path.join(presentationPath, "assets", "sbplus.xml");

            const xmlContent = fs.readFileSync(xmlPath, "utf-8");
            const result = (await parseStringPromise(xmlContent, {
                trim: true,
                explicitArray: false,
                mergeAttrs: true,
                preserveChildrenOrder: true,
                explicitChildren: false,
                charkey: "value",
            })) as StorybookXml;

            return { success: true, data: result };
        } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message };
        }
    });
}

function createWelcomeWindow() {
    welcomeWindow = new BrowserWindow({
        width: 800,
        height: 450,
        minWidth: 800,
        minHeight: 450,
        maxWidth: 800,
        maxHeight: 450,
        frame: false,
        titleBarStyle: "hidden",
        trafficLightPosition: { x: 12, y: 10 },
        resizable: false,
        icon: path.join(__dirname, "../public/icons/icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"), // Make sure this path is correct
            contextIsolation: true,
            nodeIntegration: false, // never use true unless absolutely necessary
        },
    });

    const startURL = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, "../out/index.html")}`;

    welcomeWindow.setMenuBarVisibility(false);
    welcomeWindow.loadURL(startURL);
}

app.whenReady().then(() => {
    registerIpcHandlers(); // IPCs must be ready before window launches
    createWelcomeWindow();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWelcomeWindow();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

function loadRecent(): string[] {
    if (fs.existsSync(recentFilePath)) {
        return JSON.parse(fs.readFileSync(recentFilePath, "utf-8"));
    }
    return [];
}

function saveRecent(pathToAdd: string) {
    const recent = loadRecent();
    const updated = [pathToAdd, ...recent.filter((p) => p !== pathToAdd)];
    fs.writeFileSync(recentFilePath, JSON.stringify(updated.slice(0, 10)));
}
