import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { CollegesLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("Colleges");

export default function Page() {
  if (!isDataLive()) return <ComingSoon title="Colleges" />;
  return <CollegesLive />;
}
