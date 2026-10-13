/**
 * Returns `target` only if it is a same-origin relative path ("/dashboard?x=1"),
 * otherwise `fallback`. Blocks "//evil.example", "/\\evil.example", absolute URLs,
 * and anything that would resolve to another origin.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback;
  try {
    const base = "https://edusphere.invalid";
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
