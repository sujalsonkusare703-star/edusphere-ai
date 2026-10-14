import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { ProgrammesLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("Programmes");

export default function Page() {
  if (!isDataLive()) return <ComingSoon title="Programmes" />;
  return <ProgrammesLive />;
}
