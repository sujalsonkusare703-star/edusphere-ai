"use client";

/**
 * Lazy entry points for the data pages that sit behind NEXT_PUBLIC_DATA_LIVE.
 *
 * The server `page.tsx` files import these instead of the page components, so the
 * college/programme/placement code is split into chunks that the browser downloads
 * only when a page actually renders it (i.e. only when the flag is on).
 */
import dynamic from "next/dynamic";
import { LoadingPage } from "@/components/LoadingState";

const loading = () => <LoadingPage />;

export const CollegesLive = dynamic(() => import("../colleges/CollegesClient"), { loading });
export const CollegeDetailLive = dynamic(() => import("../colleges/[id]/CollegeDetailClient"), { loading });
export const RecommendationsLive = dynamic(() => import("../recommendations/RecommendationsClient"), { loading });
export const InternshipsLive = dynamic(() => import("../internships/InternshipsClient"), { loading });
export const PlacementsLive = dynamic(() => import("../placements/PlacementsClient"), { loading });
export const SavedLive = dynamic(() => import("../saved/SavedClient"), { loading });
export const DashboardLive = dynamic(() => import("../dashboard/DashboardClient"), { loading });
export const AdminCollegeUpdatesLive = dynamic(() => import("../admin/college-updates/AdminCollegeUpdatesClient"), { loading });
