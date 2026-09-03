export {};

import type { StorybookXml } from "./sbplus";
import type { ValidationResult } from "../lib/presentationValidation";
import type { UpdateCheckResult } from "./updates";
import type { LegalState } from "../lib/legal";

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

interface ValidatePresentationPayload {
    presentationPath: string;
    xml: StorybookXml;
}

interface ExportPresentationPayload extends ValidatePresentationPayload {
    targetPath?: string;
}

interface ShowValidationResultsPayload {
    result: ValidationResult;
    presentationTitle?: string;
}

declare global {
    interface Window {
        electronAPI: {
            getPlatform: () => Promise<NodeJS.Platform>;
            getAppVersion: () => Promise<string>;
            checkForUpdates: () => Promise<UpdateCheckResult>;
            getLegalState: () => Promise<LegalState>;
            acceptLegal: () => Promise<void>;
            declineLegal: () => void;
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
            validatePresentation: (payload: ValidatePresentationPayload) => Promise<{ success: true; result: ValidationResult } | { success: false; error: string }>;
            exportPresentationPackage: (payload: ExportPresentationPayload) => Promise<{ success: true; path: string; validation: ValidationResult } | { success: false; error: string } | null>;
            showValidationResults: (payload: ShowValidationResultsPayload) => Promise<{ success: true } | { success: false; error: string }>;
            onMenuFileSave: (callback: (request: SaveRequest) => Promise<Exclude<SaveResult, null>> | Exclude<SaveResult, null>) => () => void;
            onMenuFileSaveAs: (callback: (request: SaveAsRequest) => Promise<SaveResult> | SaveResult) => () => void;
            onMenuHelpAbout: (callback: () => void) => () => void;
            setEditorDirty: (dirty: boolean) => void;
        };
    }
}
