import type { MetadataRoute } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { getSiteUrl } from "@/lib/site-url";

const PRIVATE_PATHS = ["/api/", "/admin/", "/dashboard", "/profile", "/saved"];
const DATA_PATHS = ["/colleges", "/recommendations", "/internships", "/placements"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: isDataLive() ? PRIVATE_PATHS : [...PRIVATE_PATHS, ...DATA_PATHS],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
