"use client";

import { useEffect, useState } from "react";

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

    const handleOpenRecent = (path: string) => {
        // Perform open logic here (e.g., load editor)
        console.log("Opening recent presentation:", path);
        // You could even emit IPC or route from here later
    };

    return (
        <div className="w-full h-full">
            <h2 className="text-sm text-gray-300 mb-2">Recent Presentations</h2>
            <div className="w-full h-82 bg-base-300 rounded-md">
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
                    <p className="text-xs text-gray-400 italic p-3">No recent presentations</p>
                )}
            </div>
        </div>
    );
}

export default RecentFilesSection;
