import type { MetadataRoute } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const paths = ["/", "/login", "/signup"];
  // College pages are listed only once the verified dataset is live.
  if (isDataLive()) paths.push("/colleges", "/programmes");
  return paths.map((path) => ({ url: `${siteUrl}${path}` }));
}
