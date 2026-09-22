/**
 * EduSphere AI — Automated College Intelligence Update System
 * Change Event Detail & Correction API (Phase 3 Step 4E)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, createAdminSupabaseClient } from "@/lib/services/college-updater/auth";
import { getAdminEventComparison, adminApplyCorrection } from "@/lib/services/college-updater/approval";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const result = await getAdminEventComparison(supabase, id);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error || "Event not found" }, { status: 404 });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const corrections = body.corrections;

    if (!corrections || typeof corrections !== "object") {
      return NextResponse.json({ error: "Missing corrections payload" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const result = await adminApplyCorrection(supabase, id, auth.user!.id, corrections);

    if (!result.success) {
      const isNotFound = result.error?.includes("not found");
      return NextResponse.json({ error: result.error }, { status: isNotFound ? 404 : 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin correction recorded successfully",
      data: result.data
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Failed to record corrections: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
