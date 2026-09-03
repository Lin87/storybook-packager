const { contextBridge, ipcRenderer } = require('electron');

function normalizeSaveResult(result, fallbackError) {
    if (result && typeof result === 'object' && 'success' in result) {
        return result;
    }

    return {
        success: false,
        error: fallbackError,
    };
}

contextBridge.exposeInMainWorld('electronAPI', {
    getPlatform: () => ipcRenderer.invoke("app:get-platform"),
    getAppVersion: () => ipcRenderer.invoke("app:get-version"),
    checkForUpdates: () => ipcRenderer.invoke("app:check-for-updates"),
    openReleasePage: () => ipcRenderer.invoke("app:open-release-page"),
    snoozeUpdate: (version) => ipcRenderer.send("app:snooze-update", version),
    getLegalState: () => ipcRenderer.invoke("legal:get-state"),
    acceptLegal: () => ipcRenderer.invoke("legal:accept"),
    declineLegal: () => ipcRenderer.send("legal:decline"),
    setWindowTitle: (title, edited = false) => ipcRenderer.send("window:set-title", {title, edited}),
    createNewPresentation: () => ipcRenderer.invoke('create-new-presentation'),
    openExistingPresentation: () => ipcRenderer.invoke('open-existing-presentation'),
    getRecent: () => ipcRenderer.invoke('get-recent'),
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    openEditorWindow: (presentationPath) => ipcRenderer.invoke('open-editor-window', presentationPath),
    loadPresentationData: (path) => ipcRenderer.invoke('load-presentation-data', path),
    importPresentationAsset: (payload) => ipcRenderer.invoke('presentation:import-asset', payload),
    getPresentationAssetDataUrl: (payload) => ipcRenderer.invoke('presentation:get-asset-data-url', payload),
    validatePresentation: (payload) => ipcRenderer.invoke('presentation:validate', payload),
    exportPresentationPackage: (payload) => ipcRenderer.invoke('presentation:export-package', payload),
    showValidationResults: (result) => ipcRenderer.invoke('presentation:show-validation-results', result),
    onMenuFileSave: (callback) => {
        const handler = async (_event, payload = {}) => {
            const requestId = payload.requestId;

            try {
                const result = await callback({
                    reason: payload.reason ?? 'menu',
                    save: (document) => ipcRenderer.invoke('presentation:perform-save', document),
                });

                if (requestId) {
                    ipcRenderer.send(`menu:file-save:result:${requestId}`, normalizeSaveResult(result, 'Save failed.'));
                }
            } catch (error) {
                if (requestId) {
                    ipcRenderer.send(`menu:file-save:result:${requestId}`, {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        };

        ipcRenderer.on('menu:file-save', handler);
        return () => ipcRenderer.removeListener('menu:file-save', handler);
    },
    onMenuFileSaveAs: (callback) => {
        const handler = async (_event, payload = {}) => {
            const requestId = payload.requestId;

            try {
                const result = await callback({
                    reason: payload.reason ?? 'menu',
                    saveAs: (document) => ipcRenderer.invoke('presentation:perform-save-as', document),
                });

                if (requestId) {
                    ipcRenderer.send(`menu:file-save-as:result:${requestId}`, result ?? null);
                }
            } catch (error) {
                if (requestId) {
                    ipcRenderer.send(`menu:file-save-as:result:${requestId}`, {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        };

        ipcRenderer.on('menu:file-save-as', handler);

        return () => {
            ipcRenderer.removeListener('menu:file-save-as', handler);
        };
    },
    onMenuHelpAbout: (callback) => {
        const handler = () => callback();

        ipcRenderer.on('menu:help-about', handler);

        return () => {
            ipcRenderer.removeListener('menu:help-about', handler);
        };
    },
    setEditorDirty: (dirty) => ipcRenderer.send("editor:set-dirty", Boolean(dirty)),
});
