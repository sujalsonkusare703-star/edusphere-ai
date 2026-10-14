import React from "react";
import { ExternalLink } from "@/components/icons";
import { display, safeUrl } from "@/lib/pune/format";

/** Where a row came from: source link + retrieved date (replaces the old "VERIFIED" badge). */
export function SourceNote({
  sourceUrl,
  retrievedDate,
  className = "",
}: {
  sourceUrl: string | null | undefined;
  retrievedDate: string | null | undefined;
  className?: string;
}) {
  const url = safeUrl(sourceUrl);
  return (
    <p className={`text-[11px] text-slate-500 ${className}`}>
      Source:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline break-all">
          {new URL(url).hostname}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        "Not available"
      )}
      {" · "}Retrieved: {display(retrievedDate)}
    </p>
  );
}
