/**
 * EduSphere AI — Automated College Intelligence Update System
 * Protected Server-Side Scheduler / Vercel Cron Endpoint (Phase 3 Step 4F)
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Server-side only execution.
 * - Authenticated via CRON_SECRET, EDUSPHERE_ADMIN_SECRET or a profiles.role='admin' user.
 * - Returns 503 "Coming soon" while NEXT_PUBLIC_DATA_LIVE is off.
 * - Non-authenticated requests receive 401 Unauthorized.
 * - Student accounts receive 403 Forbidden.
 * - NEVER accepts arbitrary target URLs from client input.
 * - Only processes sources registered in public.college_source_registry.
 * - NEVER automatically updates production tables (colleges, courses, cutoffs).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  AdminConfigError,
  createAdminSupabaseClient,
  getBearerToken,
  secretMatches,
  verifyAdminRequest,
} from "@/lib/services/college-updater/auth";
import { runCollegeUpdateScheduler, SchedulerOptions } from "@/lib/services/college-updater/scheduler";
import { isDataLive } from "@/lib/feature-flags";
import { comingSoonResponse } from "@/lib/coming-soon";

export const maxDuration = 60;

/**
 * Validates request authorization for cron execution:
 * 1. Vercel Cron: `Authorization: Bearer <CRON_SECRET>`
 * 2. Server-to-server: `x-edusphere-admin-key: <EDUSPHERE_ADMIN_SECRET>`
 * 3. A signed-in user with profiles.role = 'admin'
 * Secrets are compared in constant time; there is no fallback to other keys.
 */
async function authenticateCronRequest(req: NextRequest): Promise<{
  authorized: boolean;
  status?: number;
  error?: string;
}> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET is not set: scheduled Vercel cron calls will be rejected.");
  }
  if (secretMatches(getBearerToken(req), cronSecret)) {
    return { authorized: true };
  }

  if (secretMatches(req.headers.get("x-edusphere-admin-key"), process.env.EDUSPHERE_ADMIN_SECRET)) {
    return { authorized: true };
  }

  const adminAuth = await verifyAdminRequest(req);
  if (adminAuth.authorized) {
    return { authorized: true };
  }

  const status = adminAuth.errorResponse?.status ?? 401;
  return {
    authorized: false,
    status,
    error:
      status === 403
        ? "Forbidden: Student accounts cannot trigger scheduler operations."
        : status === 503
        ? "Scheduler is not available: server is not configured."
        : "Unauthorized: Valid CRON_SECRET or Administrator credentials required.",
  };
}

function schedulerErrorResponse(err: unknown) {
  if (err instanceof AdminConfigError) {
    console.error("[cron]", err.message);
    return NextResponse.json({ error: "Scheduler is not available: server is not configured." }, { status: 503 });
  }
  console.error("[cron] Scheduler execution failure:", (err as Error)?.message);
  return NextResponse.json({ error: "Scheduler execution failure." }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCronRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }
  // College data is frozen while the site is in Coming soon mode.
  if (!isDataLive()) return comingSoonResponse();

  try {
    const { searchParams } = new URL(req.url);
    const batchSize = Math.min(Math.max(parseInt(searchParams.get("batchSize") || "10", 10), 1), 20);
    const forceCheckAll = searchParams.get("forceCheckAll") === "true";
    const sourceId = searchParams.get("sourceId") || undefined;

    const options: SchedulerOptions = {
      batchSize,
      forceCheckAll,
      sourceId
    };

    const supabase = createAdminSupabaseClient();
    const summary = await runCollegeUpdateScheduler(supabase, options);

    return NextResponse.json({
      success: true,
      message: "College source monitoring scheduler executed successfully.",
      summary
    });
  } catch (err: unknown) {
    return schedulerErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCronRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }
  // College data is frozen while the site is in Coming soon mode.
  if (!isDataLive()) return comingSoonResponse();

  try {
    let body: { batchSize?: number; forceCheckAll?: boolean; sourceId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const batchSize = Math.min(Math.max(body.batchSize || 10, 1), 20);
    const forceCheckAll = Boolean(body.forceCheckAll);
    const sourceId = body.sourceId || undefined;

    const options: SchedulerOptions = {
      batchSize,
      forceCheckAll,
      sourceId
    };

    const supabase = createAdminSupabaseClient();
    const summary = await runCollegeUpdateScheduler(supabase, options);

    return NextResponse.json({
      success: true,
      message: "College source monitoring scheduler executed successfully.",
      summary
    });
  } catch (err: unknown) {
    return schedulerErrorResponse(err);
  }
}
