'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import RecentFilesSection from "./RecentFilesSection";
import AppTitleBar from "./AppTitleBar";
import NewPresentationButton from "./NewPresentationButton";
import OpenExistingButton from "./OpenExistingButton";

export default function WelcomeScreen() {

    const currentYear = new Date().getFullYear();
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        window.electronAPI.getPlatform().then(platform => {
            setIsMac(platform === 'darwin');
        });
    }, []);

    return (
        <>
            <div className="flex flex-col h-full">
                {!isMac && <AppTitleBar />}
                <div className="flex flex-1 justify-center bg-base-200 rounded-md p-8 pt-1 overflow-hidden">
                    <div className="flex flex-col items-center justify-center flex-1 space-y-6 pr-8 select-none">
                        <img src="/icons/icon.png" alt="Storybook Packager" className="w-40 mb-4" />
                        <h1 className="text-3xl font-bold mb-6">Storybook Packager</h1>
                        <div className="space-x-4 mb-6">
                            <NewPresentationButton />
                            <OpenExistingButton />
                        </div>
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">Copyright &copy; {currentYear} Ethan Lin. Sponsored by Excelsior University.</p>
                    </div>
                    <div className="flex-1">
                        <RecentFilesSection />
                    </div>
                </div>
            </div>
        </>
    );
}
