/**
 * Display helpers for the Pune dataset.
 *
 * Every column in the pune_* tables is text, and a missing value is stored as
 * the literal "NOT_AVAILABLE". Anything missing, empty or null is shown as
 * "Not available"; nothing is ever replaced by an invented default.
 */

export const NOT_AVAILABLE = "Not available";

const MISSING_MARKERS = new Set(["NOT_AVAILABLE", "N/A", "NA", "NULL", "NONE", "-"]);

/** True when a stored value carries no information. */
export function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  return trimmed === "" || MISSING_MARKERS.has(trimmed.toUpperCase());
}

/** The value as display text, or "Not available". */
export function display(value: unknown): string {
  if (isMissing(value)) return NOT_AVAILABLE;
  return typeof value === "number" ? String(value) : (value as string).trim();
}

/** The value as text, or null when missing (for conditional rendering). */
export function present(value: unknown): string | null {
  return isMissing(value) ? null : display(value);
}

/**
 * Parses a number stored as text ("35000", "2,75,000", "₹ 1,20,000", "89.13").
 * Returns null unless the whole value is one number; ranges and prose are not guessed at.
 */
export function parseNum(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (isMissing(value)) return null;
  const cleaned = (value as string).replace(/[₹,\s]/g, "").replace(/^(rs\.?|inr)/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Number with Indian digit grouping, or "Not available". */
export function displayNumber(value: unknown): string {
  const n = parseNum(value);
  return n === null ? NOT_AVAILABLE : n.toLocaleString("en-IN");
}

/** Rupee amount, or "Not available" when the stored text is not a single number. */
export function displayInr(value: unknown): string {
  const n = parseNum(value);
  return n === null ? NOT_AVAILABLE : `₹${n.toLocaleString("en-IN")}`;
}

/** Only http(s) links are rendered; anything else is treated as missing. */
export function safeUrl(value: unknown): string | null {
  const text = present(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
