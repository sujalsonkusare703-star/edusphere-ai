/**
 * EduSphere AI — Automated College Intelligence Update System
 * Admin Authorization & Role Verification
 *
 * SECURITY INVARIANTS:
 * - One admin check everywhere: `profiles.role = 'admin'`, read server-side with the
 *   service role (the same column the database policies use; users cannot change it).
 *   `user_metadata` is user-editable and is never trusted for roles.
 * - Fail closed: if SUPABASE_SERVICE_ROLE_KEY is missing, admin routes return 503;
 *   there is no fallback to the public key.
 * - No shared-secret "admin user": every admin action is tied to a real user id.
 *   Shared secrets (CRON_SECRET, EDUSPHERE_ADMIN_SECRET) are only accepted by the
 *   cron route, compared in constant time.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server.js";
import { createClient } from "@supabase/supabase-js";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export class AdminConfigError extends Error {}

/**
 * Server-only Supabase client with the service role key. Throws AdminConfigError
 * when the key (or URL) is not configured instead of silently downgrading.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new AdminConfigError("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Constant-time comparison of a provided secret against the configured one. */
export function secretMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token && token !== "null" && token !== "undefined" ? token : null;
}

/** True when the user's `profiles.role` is 'admin'. */
export async function isProfileAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Admin role lookup failed: ${error.message}`);
  return data?.role === "admin";
}

export interface AdminAuthResult {
  authorized: boolean;
  user?: User;
  errorResponse?: NextResponse;
}

const deny = (status: number, error: string, user?: User): AdminAuthResult => ({
  authorized: false,
  user,
  errorResponse: NextResponse.json({ error }, { status }),
});

/**
 * Verifies that the request carries a valid Supabase session token whose user has
 * `profiles.role = 'admin'`. 401 without a valid session, 403 for non-admins,
 * 503 when the server is missing its service role key.
 */
export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  const token = getBearerToken(req);
  if (!token) return deny(401, "Unauthorized: Missing authentication token");

  let supabase: SupabaseClient;
  try {
    supabase = createAdminSupabaseClient();
  } catch (err) {
    console.error("[admin auth]", (err as Error).message);
    return deny(503, "Admin tools are not available: server is not configured.");
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return deny(401, "Unauthorized: Invalid or expired session token");

    const user = data.user;
    if (!(await isProfileAdmin(supabase, user.id))) {
      return deny(403, "Forbidden: Administrator role required.", user);
    }
    return { authorized: true, user };
  } catch (err) {
    console.error("[admin auth] verification error:", (err as Error).message);
    return deny(500, "Authentication verification failed.");
  }
}
