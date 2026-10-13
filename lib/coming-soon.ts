import { NextResponse } from "next/server";
import type { Metadata } from "next";

/** Response for data API routes while NEXT_PUBLIC_DATA_LIVE is off. */
export function comingSoonResponse(): NextResponse {
  return NextResponse.json(
    { message: "Coming soon" },
    { status: 503, headers: { "Retry-After": "86400", "Cache-Control": "no-store" } }
  );
}

/** Metadata for a page that is currently showing the Coming soon screen. */
export function comingSoonMetadata(title: string): Metadata {
  return {
    title: `${title} (coming soon) | EduSphere AI`,
    robots: { index: false, follow: false },
  };
}
