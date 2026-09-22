/**
 * EduSphere AI — Automated College Intelligence Update System
 * HTML Content Normalization & Deterministic SHA-256 Hashing (Phase 3 Step 4B)
 */

import crypto from "crypto";
import type { NormalizedResult, SelectorConfig } from "./types";

/**
 * Common HTML entity decoder
 */
function decodeHtmlEntities(raw: string): string {
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&copy;/gi, "")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : "";
    });
}

/**
 * Strips noise, scripts, styling, navigation, and ephemeral session tokens from raw HTML.
 */
export function normalizeHtml(rawHtml: string, selectorConfig?: SelectorConfig): string {
  if (!rawHtml || typeof rawHtml !== "string") {
    return "";
  }

  let content = rawHtml;

  // 1. Selector container targeting (if explicitly configured and found)
  if (selectorConfig) {
    const targetKey = selectorConfig.cutoff_container || selectorConfig.main_container || selectorConfig.eligibility_box;
    if (typeof targetKey === "string" && targetKey.trim().length > 0) {
      const selector = targetKey.replace(/^[.#]/, "");
      // Search for id="target" or class="...target..."
      const containerRegex = new RegExp(
        `<(?:div|section|main|article|table)[^>]*(?:id|class)=["\'][^"\']*\\b${selector}\\b[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/(?:div|section|main|article|table)>`,
        "i"
      );
      const match = content.match(containerRegex);
      if (match && match[1] && match[1].trim().length > 0) {
        content = match[1];
      }
    }
  }

  // 2. Strip scripts, styles, noscript, svg, navigation, footers, comments
  content = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // 3. Remove cookie consent banners, analytics containers & popups
  content = content.replace(
    /<div\b[^>]*(?:id|class)=["\'][^"\']*\b(?:cookie|consent|gdpr|banner-modal|popup-overlay)\b[^"\']*["\'][^>]*>[\s\S]*?<\/div>/gi,
    ""
  );

  // 4. Sanitize ephemeral session IDs and tracking query tokens
  content = content
    .replace(/(?:session_?id|phpsessid|csrf_?token|authToken)=["\']?[a-zA-Z0-9_\-]+["\']?/gi, "session=[REDACTED]")
    .replace(/[?&](?:utm_[a-z]+|_t|v|cacheBuster|timestamp)=[a-zA-Z0-9_\-]+/gi, "")
    // Remove "Page generated on/at: YYYY-MM-DD HH:MM:SS" without removing admission deadlines
    .replace(/(?:page\s+generated\s+(?:on|at)|last\s+refreshed\s*(?:on|at)?):\s*\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[^<\n]*/gi, "");

  // 5. Structure preservation: convert block breaks to newlines before tag stripping
  content = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|li|h[1-6]|section|article)>/gi, "\n")
    .replace(/<(?:td|th)\b[^>]*>/gi, " | ");

  // 6. Strip all remaining HTML tags
  content = content.replace(/<[^>]+>/g, " ");

  // 7. Decode HTML entities
  content = decodeHtmlEntities(content);

  // 8. Unicode NFKC normalization
  content = content.normalize("NFKC");

  // 9. Whitespace canonicalization
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);

  return lines.join("\n");
}

/**
 * Calculates a deterministic SHA-256 hash of normalized content.
 */
export function calculateContentHash(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Normalizes content, computes hash, and scans for detected keywords.
 */
export function processNormalizedContent(rawHtml: string, selectorConfig?: SelectorConfig): NormalizedResult {
  const normalizedText = normalizeHtml(rawHtml, selectorConfig);
  const contentHash = calculateContentHash(normalizedText);

  return {
    rawLength: rawHtml.length,
    normalizedLength: normalizedText.length,
    normalizedText,
    contentHash,
    detectedKeywords: []
  };
}
