/**
 * EduSphere AI — Automated College Intelligence Update System
 * Admin Review Queue API Endpoint (Phase 3 Step 4E)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, createAdminSupabaseClient } from "@/lib/services/college-updater/auth";
import { getAdminQueue, AdminQueueFilters } from "@/lib/services/college-updater/approval";
import type { ChangeEventStatus, ChangeEventType, SignalLevel } from "@/lib/services/college-updater/types";

export async function GET(req: NextRequest) {
  // 1. Verify Administrative Authorization
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);

    const filters: AdminQueueFilters = {
      status: (searchParams.get("status") as ChangeEventStatus | "ALL") || "ALL",
      signalLevel: (searchParams.get("signalLevel") as SignalLevel | "ALL") || "ALL",
      collegeId: searchParams.get("collegeId") || undefined,
      eventType: (searchParams.get("eventType") as ChangeEventType | "ALL") || "ALL",
      search: searchParams.get("search") || undefined,
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10)
    };

    const supabase = createAdminSupabaseClient();
    const result = await getAdminQueue(supabase, filters);

    return NextResponse.json({
      success: true,
      ...result,
      authenticatedAdmin: auth.user?.id
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Failed to retrieve admin queue: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
