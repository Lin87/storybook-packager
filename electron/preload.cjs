const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    createNewPresentation: () => ipcRenderer.invoke("create-new-presentation"),
    openPresentation: () => ipcRenderer.invoke("open-presentation"),
    getRecent: () => ipcRenderer.invoke("get-recent"),
    openFile: () => ipcRenderer.invoke("open-file"),
    minimize: () => ipcRenderer.send("window:minimize"),
    close: () => ipcRenderer.send("window:close"),
    openEditorWindow: (presentationPath) => ipcRenderer.invoke("open-editor-window", presentationPath),
});
