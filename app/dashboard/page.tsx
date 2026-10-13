import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import { DashboardLive } from "@/app/_live/pages";
import DashboardComingSoon from "./DashboardComingSoon";

export const metadata: Metadata = {
  title: "Dashboard | EduSphere AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!isDataLive()) return <DashboardComingSoon />;
  return <DashboardLive />;
}
