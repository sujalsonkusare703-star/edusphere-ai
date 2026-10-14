import type { Metadata } from "next";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";

// The update reviewer edits the retired colleges/programs tables, so it stays
// paused even when NEXT_PUBLIC_DATA_LIVE is on (see isLegacyUpdaterEnabled).
export const metadata: Metadata = comingSoonMetadata("College update review");

export default function Page() {
  return (
    <ComingSoon
      title="College update review"
      message="The college update tool is paused while EduSphere moves to the new Pune dataset."
    />
  );
}
