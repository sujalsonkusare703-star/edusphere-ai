import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { CollegeDetailLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("College details");

export default function Page() {
  if (!isDataLive()) return <ComingSoon title="College details" />;
  return <CollegeDetailLive />;
}
