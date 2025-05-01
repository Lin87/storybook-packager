"use client";

import { useEffect, useState } from "react";

export default function RecentFilesSection() {
    const [recentFiles, setRecentFiles] = useState<string[]>([]);

    useEffect(() => {
        window.electronAPI.getRecent().then(setRecentFiles);
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
                <ul className="menu p-3">
                    {recentFiles.map((path, idx) => (
                        <li key={idx}>
                            <button onClick={() => handleOpenRecent(path)} className="text-left w-full">
                                {path}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-gray-400 italic p-3">No recent presentations</p>
            )}
            </div>
        </div>
    );
}
