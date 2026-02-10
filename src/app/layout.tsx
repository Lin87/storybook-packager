import type { Metadata } from "next";
import { DM_Mono, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins-sans",
    subsets: ["latin"],
    weight: ["200", "400"],
    style: ["normal", "italic"],
});

const dmMono = DM_Mono({
    variable: "--font-dm-mono",
    subsets: ["latin"],
    weight: "400",
    style: ["normal", "italic"],
});

export const metadata: Metadata = {
    title: "Storybook Packager",
    description: "Content authoring app for Storybook+ presentations.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${poppins.variable} ${dmMono.variable} antialiased border-t border-base-300`}>
                <div className="toast toast-center toast-bottom z-50" id="global-toast"></div>
                {children}
            </body>
        </html>
    );
}
