import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { CompareLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("Compare colleges");

export default function Page() {
  if (!isDataLive()) return <ComingSoon title="Compare colleges" />;
  return <CompareLive />;
}
