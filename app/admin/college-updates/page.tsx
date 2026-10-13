import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { AdminCollegeUpdatesLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("College update review");

export default function Page() {
  if (!isDataLive()) return <ComingSoon title="College update review" />;
  return <AdminCollegeUpdatesLive />;
}
