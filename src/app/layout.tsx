import type { Metadata, Viewport } from "next";
import { Roboto_Mono } from "next/font/google";

import Providers from "@/components/Providers";

import "./globals.css";

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Streakment",
  description: "Keep the streakment alive.",
  applicationName: "Streakment",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Streakment" },
  // Personal, single-user app — nothing here is meant to be found.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14110E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${robotoMono.variable} h-full`}>
      <body className="min-h-full bg-ash text-paper font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
