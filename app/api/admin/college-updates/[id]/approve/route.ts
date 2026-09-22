/**
 * EduSphere AI — Automated College Intelligence Update System
 * Atomic Event Approval API Endpoint (Phase 3 Step 4E)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, createAdminSupabaseClient } from "@/lib/services/college-updater/auth";
import { adminApproveAndApplyEvent } from "@/lib/services/college-updater/approval";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Verify Admin Role
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  try {
    let body: { notes?: string; forceOverrideConflicts?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const supabase = createAdminSupabaseClient();
    const result = await adminApproveAndApplyEvent(supabase, id, auth.user!.id, {
      notes: body.notes,
      forceOverrideConflicts: body.forceOverrideConflicts
    });

    if (!result.success) {
      const isNotFound = result.error?.includes("not found");
      const isConflict = result.error?.includes("Conflict") || result.error?.includes("already been applied");
      return NextResponse.json(
        { error: result.error },
        { status: isNotFound ? 404 : isConflict ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event approved and applied to production atomically.",
      auditId: result.auditId,
      appliedAt: result.appliedAt
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Unexpected approval failure: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
