import type { MetadataRoute } from "next";

// share_target makes the installed app appear in Android's share sheet.
// (TypeScript's Manifest type doesn't include it yet, hence the cast.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WordleGang",
    short_name: "WordleGang",
    description: "Share your Wordle with your gang and climb the leaderboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#121213",
    theme_color: "#121213",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  } as MetadataRoute.Manifest;
}
