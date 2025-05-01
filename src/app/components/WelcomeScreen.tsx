/* eslint-disable @next/next/no-img-element */
import RecentFilesSection from "./RecentFilesSection";
import AppTitleBar from "./AppTitleBar";
import NewPresentationButton from "./NewPresentationButton";
import OpenExistingButton from "./OpenExistingButton";

export default function WelcomeScreen() {
    return (
        <>
            <AppTitleBar />
            <div className="flex justify-center h-full bg-base-200 rounded-md p-8 overflow-hidden">
                <div className="flex flex-col items-center justify-center flex-1 space-y-6 pr-8 select-none">
                    <img src="/icons/icon.png" alt="Storybook Packager" className="w-40 mb-1" />
                    <h1 className="text-3xl font-bold mb-6">Storybook Packager</h1>
                    <div className="space-x-4 mb-6">
                        <NewPresentationButton />
                        <OpenExistingButton />
                    </div>
                    <p className="text-center text-xs text-gray-400">Copyright &copy; 2025 Ethan Lin</p>
                </div>
                <div className="flex-1">
                    <RecentFilesSection />
                </div>
            </div>
        </>
    );
}
