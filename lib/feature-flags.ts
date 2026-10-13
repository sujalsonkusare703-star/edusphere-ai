/**
 * Single switch for every college / programme / fee / cutoff / placement /
 * internship / AI-recommendation surface.
 *
 * NEXT_PUBLIC_DATA_LIVE is inlined at build time on both server and client,
 * so changing it requires a redeploy. Anything other than the exact string
 * "true" (including a missing variable) keeps the data surfaces hidden.
 */
export function isDataLive(): boolean {
  return process.env.NEXT_PUBLIC_DATA_LIVE === "true";
}
