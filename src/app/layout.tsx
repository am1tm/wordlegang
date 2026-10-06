import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WordleGang",
  description: "Share your Wordle with your gang and climb the leaderboard.",
  appleWebApp: { capable: true, title: "WordleGang", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#121213",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ServiceWorker />
        <main className="mx-auto w-full max-w-md px-4 pb-16 pt-4">{children}</main>
      </body>
    </html>
  );
}
