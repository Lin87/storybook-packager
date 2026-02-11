/* eslint-disable @typescript-eslint/no-require-imports */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    setWindowTitle: (title, edited = false) => ipcRenderer.send("window:set-title", {title, edited}),
    createNewPresentation: () => ipcRenderer.invoke('create-new-presentation'),
    openExistingPresentation: () => ipcRenderer.invoke('open-existing-presentation'),
    getRecent: () => ipcRenderer.invoke('get-recent'),
    openFile: () => ipcRenderer.invoke('open-file'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    openEditorWindow: (presentationPath) => ipcRenderer.invoke('open-editor-window', presentationPath),
    loadPresentationData: (path) => ipcRenderer.invoke('load-presentation-data', path),
    onMenuFileSave: (callback) => {
        const handler = () => callback();
        ipcRenderer.on('menu:file-save', handler);
        return () => ipcRenderer.removeListener('menu:file-save', handler);
    },
    onMenuFileSaveAs: (callback) => {
        const handler = () => callback();
        ipcRenderer.on('menu:file-save-as', handler);

        return () => {
            ipcRenderer.removeListener('menu:file-save-as', handler);
        };
    },
    setEditorDirty: (dirty) => ipcRenderer.send("editor:set-dirty", Boolean(dirty)),
});
