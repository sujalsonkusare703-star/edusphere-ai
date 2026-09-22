/**
 * EduSphere AI — Automated College Intelligence Update System
 * Protected Server-Side Scheduler / Vercel Cron Endpoint (Phase 3 Step 4F)
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Server-side only execution.
 * - Authenticated via Vercel CRON_SECRET or verified Supabase Admin role.
 * - Non-authenticated requests receive 401 Unauthorized.
 * - Student accounts receive 403 Forbidden.
 * - NEVER accepts arbitrary target URLs from client input.
 * - Only processes sources registered in public.college_source_registry.
 * - NEVER automatically updates production tables (colleges, courses, cutoffs).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, verifyAdminRequest } from "@/lib/services/college-updater/auth";
import { runCollegeUpdateScheduler, SchedulerOptions } from "@/lib/services/college-updater/scheduler";

/**
 * Validates request authorization for cron execution:
 * 1. Vercel Cron Authorization header (Bearer CRON_SECRET)
 * 2. Internal test secret header (x-edusphere-admin-key)
 * 3. Authenticated Supabase administrator Bearer token
 */
async function authenticateCronRequest(req: NextRequest): Promise<{
  authorized: boolean;
  status?: number;
  error?: string;
}> {
  // 1. Check for Vercel Cron Secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // 2. Check for internal admin test key
  const internalKey = req.headers.get("x-edusphere-admin-key");
  const serverSecret = process.env.EDUSPHERE_ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (internalKey && serverSecret && internalKey === serverSecret) {
    return { authorized: true };
  }

  // 3. Fallback to Supabase User Admin Token verification
  const adminAuth = await verifyAdminRequest(req);
  if (adminAuth.authorized) {
    return { authorized: true };
  }

  // Preserve 403 status if token belongs to an authenticated student
  if (adminAuth.user && adminAuth.errorResponse) {
    return {
      authorized: false,
      status: adminAuth.errorResponse.status,
      error: "Forbidden: Student accounts cannot trigger scheduler operations."
    };
  }

  return {
    authorized: false,
    status: 401,
    error: "Unauthorized: Valid CRON_SECRET or Administrator credentials required."
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateCronRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

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
    return NextResponse.json(
      { error: `Scheduler execution failure: ${(err as Error)?.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCronRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

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
    return NextResponse.json(
      { error: `Scheduler execution failure: ${(err as Error)?.message}` },
      { status: 500 }
    );
  }
}
