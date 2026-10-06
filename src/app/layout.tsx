import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DataProvider } from "@/components/DataProvider";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WordleGang",
  description: "Share your Wordle with your gang and climb the leaderboard.",
  // "black", not "black-translucent": with a translucent status bar, iOS home-screen apps
  // get a viewport shortened by the status bar but still drawn from the top of the
  // screen, leaving an undrawable strip at the bottom.
  appleWebApp: { capable: true, title: "WordleGang", statusBarStyle: "black" },
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
        <main className="mx-auto w-full max-w-md px-4 pb-16 pt-4">
          <DataProvider>{children}</DataProvider>
        </main>
      </body>
    </html>
  );
}
