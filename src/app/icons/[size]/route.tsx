import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/AppIcon";

const SIZES = new Set([96, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const maskable = new URL(req.url).searchParams.has("maskable");
  return new ImageResponse(<AppIcon size={size} padded={maskable} />, { width: size, height: size });
}
