export {};

import type { StorybookXml } from "./sbplus";

type SaveReason = "menu" | "close";

interface SaveDocumentPayload {
    presentationPath: string;
    xml: StorybookXml;
}

type SaveResult =
    | { success: true; path: string }
    | { success: false; error: string }
    | null;

interface SaveRequest {
    reason: SaveReason;
    save: (document: SaveDocumentPayload) => Promise<Exclude<SaveResult, null>>;
}

interface SaveAsRequest {
    reason: SaveReason;
    saveAs: (document: SaveDocumentPayload) => Promise<SaveResult>;
}

interface ImportAssetPayload {
    presentationPath: string;
    kind: "page-image" | "page-audio" | "bundle-audio" | "video" | "splash-image" | "quiz-image" | "quiz-audio" | "html";
    sourceName?: string;
    imageFormat?: string;
    targetBaseName?: string;
}

interface ImportAssetSuccess {
    success: true;
    path: string;
    originalPath: string;
    originalBaseName: string;
    targetBaseName: string;
}

interface AssetDataPayload {
    filePath: string;
}

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
            importPresentationAsset: (payload: ImportAssetPayload) => Promise<ImportAssetSuccess | { success: false; error: string }>;
            getPresentationAssetDataUrl: (payload: AssetDataPayload) => Promise<{ success: true; dataUrl: string } | { success: false; error: string }>;
            onMenuFileSave: (callback: (request: SaveRequest) => Promise<Exclude<SaveResult, null>> | Exclude<SaveResult, null>) => () => void;
            onMenuFileSaveAs: (callback: (request: SaveAsRequest) => Promise<SaveResult> | SaveResult) => () => void;
            setEditorDirty: (dirty: boolean) => void;
        };
    }
}
