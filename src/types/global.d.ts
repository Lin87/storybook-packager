export {};

declare global {
    interface Window {
        electronAPI: {
            createNewPresentation: () => Promise<string | { error: string } | null>;
            openPresentation: () => Promise<string | null>;
            getRecent: () => Promise<string[]>;
            openFile: () => Promise<string | null>;
            minimize: () => void;
            close: () => void;
            openEditorWindow: (presentationPath: string) => Promise<void>;
        };
    }
}
