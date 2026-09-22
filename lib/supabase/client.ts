import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof window === "undefined") {
    // During Next.js build-time prerendering (e.g. /_not-found, static pages),
    // public environment variables may not be present in the build container.
    // Provide safe placeholders strictly during server prerender to avoid crashing the build,
    // while ensuring genuine browser execution requires valid credentials.
    return createBrowserClient(
      url || "https://placeholder-build.supabase.co",
      key || "placeholder-build-key"
    );
  }

  // Browser runtime execution: Must use genuine credentials
  if (!client) {
    client = createBrowserClient(url!, key!);
  }

  return client;
}