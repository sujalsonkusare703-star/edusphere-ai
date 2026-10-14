import type { Metadata } from "next";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";

// Not in the Pune dataset: shown as coming soon whether or not NEXT_PUBLIC_DATA_LIVE is on.
export const metadata: Metadata = comingSoonMetadata("Internships");

export default function Page() {
  return <ComingSoon title="Internships" message="Internship listings are not part of the EduSphere database yet. This section is coming soon." />;
}
