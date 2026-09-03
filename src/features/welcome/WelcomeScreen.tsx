'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import RecentFilesSection from "./RecentFilesSection";
import AppTitleBar from "./AppTitleBar";
import NewPresentationButton from "./NewPresentationButton";
import OpenExistingButton from "./OpenExistingButton";
import AboutModal from "@/components/AboutModal";
import clsx from "clsx";

export default function WelcomeScreen() {

    const currentYear = new Date().getFullYear();
    const [isMac, setIsMac] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    useEffect(() => {
        window.electronAPI.getPlatform().then(platform => {
            setIsMac(platform === 'darwin');
        });
    }, []);

    return (
        <>
            <div className="flex flex-col h-full">
                {!isMac && <AppTitleBar />}
                <div className={clsx("flex flex-1 justify-center bg-base-200 rounded-md p-8 overflow-hidden", !isMac && "pt-1")}>
                    <div className="flex flex-col items-center justify-center flex-1 space-y-6 pr-8 select-none">
                        <img src="/icons/icon.png" alt="Storybook Packager" className="w-40 mb-4" />
                        <h1 className="text-3xl font-bold mb-6">Storybook Packager</h1>
                        <div className="space-x-4 mb-6">
                            <NewPresentationButton />
                            <OpenExistingButton />
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                            <div className="text-center">
                                <button className="btn btn-ghost btn-xs" onClick={() => setAboutOpen(true)}>About Storybook Packager</button>
                            </div>
                            <p className="text-center text-xs text-gray-500 dark:text-gray-400">Copyright &copy; {currentYear} Ethan Lin. Sponsored by Excelsior University.</p>
                        </div>
                    </div>
                    <div className="flex-1">
                        <RecentFilesSection />
                    </div>
                </div>
            </div>
            <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </>
    );
}
