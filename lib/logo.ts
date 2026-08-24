import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedLogoDataUri: string | null = null;

/** The official brand logo (public/logo-512.png) as a base64 data URI, for embedding in a next/og ImageResponse <img src> — those render server-side via Satori and can't resolve a plain "/logo.png" the way a browser <img> would. */
export function getLogoDataUri(): string {
  if (!cachedLogoDataUri) {
    const buffer = readFileSync(join(process.cwd(), "public", "logo-512.png"));
    cachedLogoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  }
  return cachedLogoDataUri;
}
