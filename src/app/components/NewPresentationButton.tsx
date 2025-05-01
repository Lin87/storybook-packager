"use client";

import { useState } from "react";

interface NewPresentationButtonProps {
    onCreated?: (path: string) => void;
}

function NewPresentationButton({ onCreated }: NewPresentationButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleNew = async () => {
        setLoading(true);

        try {
            const result = await window.electronAPI.createNewPresentation();

            if (result === null) {
                // User canceled folder picker — silently return
                return;
            }

            if (isErrorResult(result)) {
                alert(`Failed to create presentation: ${result?.error ?? "Unknown error"}`);
                return;
            }

            console.log("New presentation created at:", result);
            onCreated?.(result);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button className="btn btn-primary" onClick={handleNew} disabled={loading}>
            {loading ? "Creating..." : "New Presentation"}
        </button>
    );
}

function isErrorResult(result: unknown): result is { error: string } {
    return typeof result === "object" && result !== null && "error" in result;
}

export default NewPresentationButton;
