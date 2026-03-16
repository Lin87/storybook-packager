export {};

import type { StorybookXml } from "./sbplus";

declare global {
    interface Window {
        electronAPI: {
            getPlatform: () => Promise<NodeJS.Platform>;
            setWindowTitle: (title: string, edited?: boolean) => void;
            createNewPresentation: () => Promise<string | { error: string } | null>;
            openExistingPresentation: () => Promise<string | { error: string } | null>;
            getRecent: () => Promise<string[]>;
            minimize: () => void;
            close: () => void;
            openEditorWindow: (presentationPath: string) => Promise<void>;
            loadPresentationData: (path: string) => Promise<{ success: true; data: StorybookXml } | { success: false; error: string }>;
            onMenuFileSave: (callback: () => void) => () => void;
            onMenuFileSaveAs: (callback: () => void) => () => void;
            setEditorDirty: (dirty: boolean) => void;
        };
    }
}
