import type { Metadata } from "next";
import { DM_Mono, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins-sans",
  subsets: ["latin"],
  weight: ["200", "400"],
  style: ["normal", "italic"]
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"]
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
    <html data-theme="night" lang="en">
      <body className={`${poppins.variable} ${dmMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
