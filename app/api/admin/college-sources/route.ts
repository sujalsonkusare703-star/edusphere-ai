/**
 * EduSphere AI — Automated College Intelligence Update System
 * Admin Monitored Sources & Health Management API (Phase 3 Step 4F)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, createAdminSupabaseClient } from "@/lib/services/college-updater/auth";
import { runSourceMonitoringPipeline } from "@/lib/services/college-updater/scheduler";
import type { CollegeSourceRegistry } from "@/types";

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const supabase = createAdminSupabaseClient();
    
    // Fetch registered sources with college names
    const { data: sources, error } = await supabase
      .from("college_source_registry")
      .select(`
        *,
        colleges:college_id (
          id,
          name,
          admission_verification_status
        )
      `)
      .order("source_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch open pending events count per source
    const { data: pendingEvents } = await supabase
      .from("college_data_change_events")
      .select("source_id, status")
      .in("status", ["DETECTED", "PARSED", "PENDING_REVIEW"]);

    const pendingCountBySource: Record<string, number> = {};
    (pendingEvents || []).forEach((e) => {
      pendingCountBySource[e.source_id] = (pendingCountBySource[e.source_id] || 0) + 1;
    });

    const enriched = (sources || []).map((s) => ({
      ...s,
      pendingEventsCount: pendingCountBySource[s.id] || 0
    }));

    return NextResponse.json({
      success: true,
      sources: enriched,
      total: enriched.length
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Failed to fetch monitored sources: ${(err as Error)?.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const sourceId = body?.sourceId;

    if (!sourceId) {
      return NextResponse.json({ error: "Missing required parameter: sourceId" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const { data: source, error } = await supabase
      .from("college_source_registry")
      .select("*")
      .eq("id", sourceId)
      .single();

    if (error || !source) {
      return NextResponse.json({ error: `Source not found: ${sourceId}` }, { status: 404 });
    }

    const result = await runSourceMonitoringPipeline(supabase, source as CollegeSourceRegistry);

    return NextResponse.json({
      success: true,
      message: `Source check completed for ${source.source_name}`,
      result
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Failed to check source: ${(err as Error)?.message}` },
      { status: 500 }
    );
  }
}
