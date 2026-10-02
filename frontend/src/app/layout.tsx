import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicBrain",
  description: "Report civic problems and help your municipality decide what to fix first.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0F5E63" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
