/**
 * Database helpers for Supabase integration
 */

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Safely converts an opportunity ID to a valid UUID format for DB storage.
 * If already a valid UUID, returns it unchanged.
 * If a short demo string like 'col-1', deterministically maps it into a UUID format:
 * '00000000-0000-0000-0000-' + hex(itemId) padded to 12 chars.
 */
export function itemIdToDbUuid(itemId: string): string {
  if (isUuid(itemId)) return itemId;
  let hex = "";
  for (let i = 0; i < itemId.length; i++) {
    hex += itemId.charCodeAt(i).toString(16).padStart(2, "0");
  }
  const paddedHex = hex.padStart(12, "0").slice(-12);
  return `00000000-0000-0000-0000-${paddedHex}`;
}

/**
 * Reverses itemIdToDbUuid:
 * If it matches our deterministic prefix '00000000-0000-0000-0000-', decode hex back to ASCII string.
 * Otherwise returns the UUID as-is.
 */
export function dbUuidToItemId(uuidStr: string): string {
  if (uuidStr.startsWith("00000000-0000-0000-0000-")) {
    const hex = uuidStr.slice(24).replace(/^0+/, "");
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str || uuidStr;
  }
  return uuidStr;
}

/**
 * Normalizes and deduplicates skills case-insensitively while preserving the
 * casing of the first encountered variation.
 */
export function normalizeAndDeduplicateSkills(skillsArr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of skillsArr) {
    const trimmed = (s || "").trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }
  return result;
}
