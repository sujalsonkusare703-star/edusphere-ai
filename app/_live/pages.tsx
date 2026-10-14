"use client";

/**
 * Lazy entry points for the data pages that sit behind NEXT_PUBLIC_DATA_LIVE.
 *
 * The server `page.tsx` files import these instead of the page components, so the
 * Pune data code is split into chunks that the browser downloads only when a page
 * actually renders it (i.e. only when the flag is on).
 */
import dynamic from "next/dynamic";
import { LoadingPage } from "@/components/LoadingState";

const loading = () => <LoadingPage />;

export const CollegesLive = dynamic(() => import("../colleges/PuneCollegesClient"), { loading });
export const CollegeDetailLive = dynamic(() => import("../colleges/[id]/PuneCollegeDetailClient"), { loading });
export const ProgrammesLive = dynamic(() => import("../programmes/ProgrammesClient"), { loading });
// Reads ?ids= from the URL on first render, so it is not server-rendered.
export const CompareLive = dynamic(() => import("../compare/CompareClient"), { loading, ssr: false });
export const RecommendationsLive = dynamic(() => import("../recommendations/PuneRecommendationsClient"), { loading });
export const SavedLive = dynamic(() => import("../saved/PuneSavedClient"), { loading });
