export {};

declare global {
    interface Window {
        electronAPI: {
            createNewPresentation: () => Promise<string | { error: string } | null>;
            openPresentation: () => Promise<string | null>;
            getRecent: () => Promise<string[]>;
            openFile: () => Promise<string | null>;
            openEditorWindow?: () => void;
            minimize: () => void;
            close: () => void;
        };
    }
}
