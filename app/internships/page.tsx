import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { InternshipsLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("Internships");

export default function Page() {
  if (!isDataLive()) {
    return (
      <ComingSoon
        title="Internships"
        message="We are building a verified list of internships for Maharashtra students. This section is coming soon."
      />
    );
  }
  return <InternshipsLive />;
}
