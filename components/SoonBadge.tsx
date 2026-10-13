import { isDataLive } from "@/lib/feature-flags";

/** Small "Coming soon" pill shown next to data links while the data is offline. */
export function SoonBadge({ className = "" }: { className?: string }) {
  if (isDataLive()) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap ${className}`}
    >
      Coming soon
    </span>
  );
}
