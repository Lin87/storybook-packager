"use client";

import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { showToast } from "@/app/utils/toast";

function OpenExistingButton() {
    const handleOpenExisting = async () => {
        const result = await window.electronAPI.openExistingPresentation();

        if (result === null) return;
        
        if (typeof result === "object" && "error" in result) {
            const message = typeof result === "object" && result?.error ? result.error : "Unknown error";
            showToast(`Failed to open presentation. ${message}`, "error", <ExclamationTriangleFill />);
            return;
        }

        window.dispatchEvent(new CustomEvent("recent-files-updated"));
        window.electronAPI.openEditorWindow(result);
    };

    return (
        <button className="btn btn-secondary" onClick={handleOpenExisting}>
            Open Existing
        </button>
    );
}

export default OpenExistingButton;
