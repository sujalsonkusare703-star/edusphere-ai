/**
 * EduSphere AI — Automated College Intelligence Update System
 * Event Rejection API Endpoint (Phase 3 Step 4E)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, createAdminSupabaseClient } from "@/lib/services/college-updater/auth";
import { adminRejectEvent } from "@/lib/services/college-updater/approval";

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
    const body = await req.json();
    const reason = body?.reason;

    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A valid rejection justification is strictly mandatory (minimum 5 characters)." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();
    const result = await adminRejectEvent(supabase, id, auth.user!.id, reason);

    if (!result.success) {
      const isNotFound = result.error?.includes("not found");
      return NextResponse.json({ error: result.error }, { status: isNotFound ? 404 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Event rejected successfully.",
      data: result.data
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Unexpected rejection failure: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
