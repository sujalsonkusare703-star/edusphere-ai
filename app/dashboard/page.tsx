import type { Metadata } from "next";
import { isDataLive } from "@/lib/feature-flags";
import DashboardComingSoon from "./DashboardComingSoon";

export const metadata: Metadata = {
  title: "Dashboard | EduSphere AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DashboardComingSoon live={isDataLive()} />;
}
