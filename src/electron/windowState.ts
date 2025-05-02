import fs from "fs";
import path from "path";
import { app, BrowserWindow } from "electron";

function getWelcomeStatePath() {
    return path.join(app.getPath("userData"), "welcome-window-state.json");
}

function getEditorStatePath() {
    return path.join(app.getPath("userData"), "editor-window-state.json");
}

export function loadWelcomeWindowState(): { x?: number; y?: number } {
    try {
        const welcomePath = getWelcomeStatePath();
        if (fs.existsSync(welcomePath)) {
            const { x, y } = JSON.parse(fs.readFileSync(welcomePath, "utf-8"));
            return { x, y };
        }
    } catch {}
    return {};
}

export function saveWelcomeWindowState(win: BrowserWindow) {
    if (win.isDestroyed()) return;
    const { x, y } = win.getBounds();
    const welcomePath = getWelcomeStatePath();
    fs.writeFileSync(welcomePath, JSON.stringify({ x, y }));
}

export function loadEditorWindowState(): {
    width: number;
    height: number;
    x?: number;
    y?: number;
    fullscreen?: boolean;
    maximized?: boolean;
} {
    try {
        const editorPath = getEditorStatePath();
        if (fs.existsSync(editorPath)) {
            const state = JSON.parse(fs.readFileSync(editorPath, "utf-8"));
            return {
                width: state.width || 1024,
                height: state.height || 768,
                x: state.x,
                y: state.y,
                fullscreen: state.fullscreen || false,
                maximized: state.maximized || false,
            };
        }
    } catch {}
    return { width: 1024, height: 768, fullscreen: false, maximized: false };
}

export function saveEditorWindowState(win: BrowserWindow) {
    if (win.isDestroyed()) return;

    const editorPath = getEditorStatePath();
    const bounds = win.getBounds();
    const isFull = win.isFullScreen();
    const isMax = win.isMaximized();

    fs.writeFileSync(editorPath, JSON.stringify({ ...bounds, fullscreen: isFull, maximized: isMax }));
}
