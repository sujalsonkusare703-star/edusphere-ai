import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { PlacementsLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("Placements");

export default function Page() {
  if (!isDataLive()) {
    return (
      <ComingSoon
        title="Placements"
        message="We are collecting sourced placement records for Maharashtra colleges. This section is coming soon."
      />
    );
  }
  return <PlacementsLive />;
}
