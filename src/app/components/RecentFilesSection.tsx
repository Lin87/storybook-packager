"use client";

import { useEffect, useState } from "react";
import { ExclamationTriangleFill } from "react-bootstrap-icons";
import { showToast } from "@/app/utils/toast";

function RecentFilesSection() {
    const [recentFiles, setRecentFiles] = useState<string[]>([]);

    useEffect(() => {
        const loadRecent = () => {
            window.electronAPI.getRecent().then((files) => {
                const unique = Array.from(new Set(files));
                setRecentFiles(unique);
            });
        };

        loadRecent();

        const handleUpdate = () => loadRecent();
        window.addEventListener("recent-files-updated", handleUpdate);

        return () => {
            window.removeEventListener("recent-files-updated", handleUpdate);
        };
    }, []);

    const handleOpenRecent = async (path: string) => {
        // Check if sbplus.xml still exists before launching
        const result = await window.electronAPI.loadPresentationData(path);

        if (!result || result.success === false) {
            showToast("Could not open this presentation. It may have been moved or deleted.", "error", <ExclamationTriangleFill />);
            window.dispatchEvent(new CustomEvent("recent-files-updated")); // refresh the list
            return;
        }

        window.electronAPI.openEditorWindow(path);
    };

    return (
        <div className="flex flex-col w-full h-full gap-1">
            <h2 className="flex items-center text-sm dark:text-gray-300">Recent Presentations</h2>
            <div className="w-full flex-1 bg-base-300 rounded-md">
                {recentFiles.length > 0 ? (
                    <ul className="menu w-full h-full overflow-y-auto">
                        {recentFiles.map((fullPath, idx) => {
                            const folderName = fullPath.split(/[/\\]/).pop();
                            return (
                                <li key={idx}>
                                    <button onClick={() => handleOpenRecent(fullPath)} className="btn-ghost text-left w-full">
                                        <div className="flex flex-col items-start">
                                            <span>{folderName}</span>
                                            <span className="text-xs text-gray-400">{fullPath}</span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-xs text-gray-700 dark:text-gray-400 italic p-3">No recent presentations</p>
                )}
            </div>
        </div>
    );
}

export default RecentFilesSection;
