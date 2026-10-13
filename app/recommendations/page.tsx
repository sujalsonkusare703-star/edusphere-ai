import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonMetadata } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/ComingSoon";
import { RecommendationsLive } from "@/app/_live/pages";

export const metadata: Metadata = isDataLive() ? {} : comingSoonMetadata("AI Recommendations");

export default function Page() {
  if (!isDataLive()) {
    return (
      <ComingSoon
        title="AI Recommendations"
        message="AI recommendations will use our verified database of Maharashtra colleges, which we are still building. This section is coming soon."
      />
    );
  }
  return <RecommendationsLive />;
}
