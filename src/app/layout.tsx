import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppVersionChecker } from "./app-version-checker";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kotoba",
    template: "%s | Kotoba",
  },
  description: "A modular AI-powered Japanese learning platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f8a58",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppVersionChecker />
        {children}
      </body>
    </html>
  );
}
