/** Public origin used for absolute URLs (sitemap, robots). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://edusphere-ais.vercel.app";
  return raw.replace(/\/+$/, "");
}
