/**
 * EduSphere AI — Automated College Intelligence Update System
 * Admin Authorization & Role Verification (Phase 3 Step 4E)
 *
 * CRITICAL SECURITY INVARIANTS:
 * - Admin authorization is strictly evaluated server-side using Supabase Auth app_metadata.role = "admin".
 * - Never rely on client-side localStorage flags, query params, or email matching alone.
 * - Non-authenticated users receive 401 Unauthorized.
 * - Authenticated students/non-admins receive 403 Forbidden.
 */

import { NextResponse } from "next/server.js";
import { createClient } from "@supabase/supabase-js";
import type { User, SupabaseClient } from "@supabase/supabase-js";

/**
 * Evaluates whether a given Supabase user has the verified administrative role.
 */
export function isUserAdmin(user: User | null): boolean {
  if (!user) return false;
  // Supabase app_metadata is strictly protected and only modifiable by service role
  const appRole = user.app_metadata?.role;
  return appRole === "admin";
}

/**
 * Creates a server-side Supabase client with service role key if present,
 * otherwise falling back to standard publishable key for development testing.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export interface AdminAuthResult {
  authorized: boolean;
  user?: User;
  errorResponse?: NextResponse;
}

/**
 * Verifies that an incoming Next.js Request carries a valid Bearer token
 * belonging to an authenticated user with app_metadata.role = "admin".
 *
 * For local development/testing without live service-role provisioning,
 * accepts an authorized test bypass header 'x-edusphere-admin-key' if matching
 * the server-side environment secret.
 */
export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  // 1. Check Authorization Bearer Header
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.slice(7).trim();
  }

  // 2. Check for internal admin key (for automated tests or server-to-server cron)
  const internalKey = req.headers.get("x-edusphere-admin-key");
  const serverSecret = process.env.EDUSPHERE_ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (internalKey && serverSecret && internalKey === serverSecret) {
    const mockAdminUser = {
      id: "admin-system-service",
      app_metadata: { role: "admin" },
      user_metadata: { role: "admin" },
      aud: "authenticated",
      created_at: new Date().toISOString()
    } as unknown as User;
    return { authorized: true, user: mockAdminUser };
  }

  if (!token || token === "null" || token === "undefined") {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Missing authentication token" },
        { status: 401 }
      )
    };
  }

  // 3. Verify user with Supabase Auth
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return {
        authorized: false,
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Invalid or expired session token" },
          { status: 401 }
        )
      };
    }

    const user = data.user;

    // 4. Role Authorization Check: Must have app_metadata.role === 'admin'
    if (!isUserAdmin(user)) {
      return {
        authorized: false,
        user,
        errorResponse: NextResponse.json(
          { error: "Forbidden: Administrator role required. Student accounts cannot approve or apply changes." },
          { status: 403 }
        )
      };
    }

    return { authorized: true, user };
  } catch (err: unknown) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Authentication verification error: ${(err as Error).message}` },
        { status: 500 }
      )
    };
  }
}
