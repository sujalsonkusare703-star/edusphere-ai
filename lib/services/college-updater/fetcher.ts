/**
 * EduSphere AI — Automated College Intelligence Update System
 * Server-Side Source Fetcher with SSRF Protection, Rate Limiting & Safe Retries
 * (Phase 3 Step 4B)
 */

import net from "net";
import type { ContentFormat } from "@/types";
import type { FetchOptions, FetchResult } from "./types";

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_USER_AGENT = "EduSphereAI-CollegeMonitor/1.0";
const MAX_REDIRECTS = 5;
const MAX_RETRY_ATTEMPTS = 3;
const MIN_HOST_INTERVAL_MS = 2000; // 2 seconds polite delay per origin
const MAX_GLOBAL_CONCURRENCY = 3;

/**
 * Global polite rate limiter and concurrency queue
 */
class FetchRateLimiter {
  private hostTimestamps = new Map<string, number>();
  private activeCount = 0;
  private queue: Array<() => void> = [];

  public async acquire(hostname: string): Promise<void> {
    while (this.activeCount >= MAX_GLOBAL_CONCURRENCY) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;

    const lastTime = this.hostTimestamps.get(hostname) || 0;
    const now = Date.now();
    const elapsed = now - lastTime;
    if (elapsed < MIN_HOST_INTERVAL_MS) {
      const waitMs = MIN_HOST_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.hostTimestamps.set(hostname, Date.now());
  }

  public release(hostname: string): void {
    this.hostTimestamps.set(hostname, Date.now());
    this.activeCount = Math.max(0, this.activeCount - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const rateLimiter = new FetchRateLimiter();

/**
 * Validates a target URL against SSRF, unsupported protocols, and internal networks.
 */
export function validateSafeUrl(
  urlString: string,
  options?: { allowLocalhostForTesting?: boolean }
): { safe: boolean; errorCode?: string; errorMessage?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, errorCode: "MALFORMED_URL", errorMessage: `Invalid URL format: ${urlString}` };
  }

  // Testing bypass for local mock servers
  if (options?.allowLocalhostForTesting && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
    return { safe: true };
  }

  // Protocol validation: Strictly https:// only in production
  if (parsed.protocol !== "https:") {
    return {
      safe: false,
      errorCode: "UNSUPPORTED_PROTOCOL",
      errorMessage: `Unsupported protocol "${parsed.protocol}". Only "https:" is permitted.`
    };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, "");

  // Block localhost, loopback, and unadorned local names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return {
      safe: false,
      errorCode: "SSRF_DETECTED",
      errorMessage: `Access to localhost and loopback targets is strictly forbidden: ${rawHostname}`
    };
  }

  // Block single-label hostnames without dots (e.g. "internal-db", "metadata", "intranet")
  if (!hostname.includes(".") && !hostname.includes(":")) {
    return {
      safe: false,
      errorCode: "SSRF_DETECTED",
      errorMessage: `Access to non-FQDN internal hosts is forbidden: ${rawHostname}`
    };
  }

  // IP address checks
  const ipVer = net.isIP(hostname);
  if (ipVer === 4) {
    const octets = hostname.split(".").map(Number);
    const [b0, b1] = octets;

    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Loopback IPv4 target blocked." };
    }
    // 10.0.0.0/8 (Private)
    if (b0 === 10) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Private 10.0.0.0/8 network target blocked." };
    }
    // 172.16.0.0/12 (Private: 172.16.x.x - 172.31.x.x)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Private 172.16.0.0/12 network target blocked." };
    }
    // 192.168.0.0/16 (Private)
    if (b0 === 192 && b1 === 168) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Private 192.168.0.0/16 network target blocked." };
    }
    // 169.254.0.0/16 (Link-local & AWS/GCP cloud metadata 169.254.169.254)
    if (b0 === 169 && b1 === 254) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Cloud metadata / Link-local IPv4 target blocked." };
    }
    // 0.0.0.0/8
    if (b0 === 0) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "0.0.0.0/8 target blocked." };
    }
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Shared carrier NAT target blocked." };
    }
    // Multicast & Reserved (224.0.0.0/4 and above)
    if (b0 >= 224) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Multicast or reserved IP target blocked." };
    }
  } else if (ipVer === 6) {
    const norm = hostname.toLowerCase();
    if (norm === "::1" || norm === "0:0:0:0:0:0:0:1") {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Loopback IPv6 target blocked." };
    }
    if (norm.startsWith("fe8") || norm.startsWith("fe9") || norm.startsWith("fea") || norm.startsWith("feb")) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Link-local IPv6 target blocked." };
    }
    if (norm.startsWith("fc") || norm.startsWith("fd")) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "Unique-local IPv6 target blocked." };
    }
    if (norm.includes("ffff:")) {
      return { safe: false, errorCode: "SSRF_DETECTED", errorMessage: "IPv4-mapped IPv6 target blocked." };
    }
  }

  return { safe: true };
}

/**
 * Categorizes the Content-Type header into a supported ContentFormat.
 */
export function detectContentFormat(contentTypeHeader?: string | null): ContentFormat | "UNKNOWN" {
  if (!contentTypeHeader) return "UNKNOWN";
  const clean = contentTypeHeader.toLowerCase().split(";")[0].trim();

  if (clean === "text/html" || clean === "application/xhtml+xml") {
    return "HTML";
  }
  if (clean === "application/pdf") {
    return "PDF";
  }
  if (clean === "application/json" || clean === "text/json") {
    return "JSON";
  }
  return "UNKNOWN";
}

/**
 * Performs a single HTTP request with manual redirect checking and streaming size limits.
 */
async function executeSingleFetch(
  targetUrl: string,
  options: FetchOptions,
  redirectCount = 0
): Promise<FetchResult> {
  const startTime = Date.now();
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxSizeBytes ?? MAX_PAYLOAD_BYTES;

  // SSRF pre-check
  const safety = validateSafeUrl(targetUrl, { allowLocalhostForTesting: options.allowLocalhostForTesting });
  if (!safety.safe) {
    return {
      success: false,
      url: targetUrl,
      finalUrl: targetUrl,
      detectedFormat: "UNKNOWN",
      durationMs: Date.now() - startTime,
      redirectCount,
      errorCode: safety.errorCode,
      errorMessage: safety.errorMessage
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual", // Mandatory for manual SSRF verification on redirects
      headers: {
        "User-Agent": options.userAgent || DEFAULT_USER_AGENT,
        Accept: "text/html,application/pdf,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    clearTimeout(timer);

    // Handle redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: targetUrl,
          httpStatus: response.status,
          detectedFormat: "UNKNOWN",
          durationMs: Date.now() - startTime,
          redirectCount,
          errorCode: "INVALID_REDIRECT",
          errorMessage: "Redirect status received without Location header"
        };
      }

      if (redirectCount >= maxRedirects) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: targetUrl,
          httpStatus: response.status,
          detectedFormat: "UNKNOWN",
          durationMs: Date.now() - startTime,
          redirectCount,
          errorCode: "TOO_MANY_REDIRECTS",
          errorMessage: `Exceeded maximum redirect limit of ${maxRedirects}`
        };
      }

      // Resolve redirect destination against current URL
      let nextUrl: string;
      try {
        nextUrl = new URL(location, targetUrl).toString();
      } catch {
        return {
          success: false,
          url: targetUrl,
          finalUrl: targetUrl,
          httpStatus: response.status,
          detectedFormat: "UNKNOWN",
          durationMs: Date.now() - startTime,
          redirectCount,
          errorCode: "MALFORMED_REDIRECT_URL",
          errorMessage: `Malformed redirect location: ${location}`
        };
      }

      // Validate redirect destination against SSRF rules
      const redirectSafety = validateSafeUrl(nextUrl, { allowLocalhostForTesting: options.allowLocalhostForTesting });
      if (!redirectSafety.safe) {
        return {
          success: false,
          url: targetUrl,
          finalUrl: nextUrl,
          httpStatus: response.status,
          detectedFormat: "UNKNOWN",
          durationMs: Date.now() - startTime,
          redirectCount: redirectCount + 1,
          errorCode: "UNSAFE_REDIRECT",
          errorMessage: `Redirect to unsafe destination blocked: ${redirectSafety.errorMessage}`
        };
      }

      // Follow redirect recursively
      return await executeSingleFetch(nextUrl, options, redirectCount + 1);
    }

    const contentType = response.headers.get("content-type") || "";
    const detectedFormat = detectContentFormat(contentType);

    // Non-2xx check
    if (!response.ok) {
      const isNotFound = response.status === 404 || response.status === 410;
      return {
        success: false,
        url: targetUrl,
        finalUrl: targetUrl,
        httpStatus: response.status,
        contentType,
        detectedFormat,
        durationMs: Date.now() - startTime,
        redirectCount,
        errorCode: isNotFound ? "SOURCE_NOT_FOUND" : `HTTP_${response.status}`,
        errorMessage: isNotFound ? `Source returned ${response.status} Not Found` : `HTTP ${response.status}: ${response.statusText}`
      };
    }

    // Supported content-type validation
    if (detectedFormat === "UNKNOWN") {
      return {
        success: false,
        url: targetUrl,
        finalUrl: targetUrl,
        httpStatus: response.status,
        contentType,
        detectedFormat: "UNKNOWN",
        durationMs: Date.now() - startTime,
        redirectCount,
        errorCode: "UNSUPPORTED_CONTENT_TYPE",
        errorMessage: `Content-Type "${contentType}" is not supported (expected HTML, PDF, or JSON)`
      };
    }

    // Size limit check via Content-Length header
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      return {
        success: false,
        url: targetUrl,
        finalUrl: targetUrl,
        httpStatus: response.status,
        contentType,
        detectedFormat,
        durationMs: Date.now() - startTime,
        redirectCount,
        errorCode: "PAYLOAD_TOO_LARGE",
        errorMessage: `Content-Length (${contentLength} bytes) exceeds limit of ${maxBytes} bytes`
      };
    }

    // Stream download with active byte counting
    if (!response.body) {
      return {
        success: true,
        url: targetUrl,
        finalUrl: targetUrl,
        httpStatus: response.status,
        contentType,
        detectedFormat,
        bodyBuffer: Buffer.alloc(0),
        bodyText: "",
        durationMs: Date.now() - startTime,
        redirectCount
      };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        return {
          success: false,
          url: targetUrl,
          finalUrl: targetUrl,
          httpStatus: response.status,
          contentType,
          detectedFormat,
          durationMs: Date.now() - startTime,
          redirectCount,
          errorCode: "PAYLOAD_TOO_LARGE",
          errorMessage: `Streamed payload exceeded size limit of ${maxBytes} bytes during download`
        };
      }
      chunks.push(value);
    }

    const totalBuffer = Buffer.concat(chunks);
    const bodyText = detectedFormat === "PDF" ? undefined : totalBuffer.toString("utf8");

    return {
      success: true,
      url: targetUrl,
      finalUrl: targetUrl,
      httpStatus: response.status,
      contentType,
      detectedFormat,
      bodyBuffer: totalBuffer,
      bodyText,
      durationMs: Date.now() - startTime,
      redirectCount
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = (err as Error)?.name === "AbortError";
    return {
      success: false,
      url: targetUrl,
      finalUrl: targetUrl,
      detectedFormat: "UNKNOWN",
      durationMs: Date.now() - startTime,
      redirectCount,
      errorCode: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
      errorMessage: isAbort ? `Request timed out after ${timeoutMs}ms` : (err as Error)?.message || "Unknown network error"
    };
  }
}

/**
 * Primary server-side fetch function with rate limiting, polite delays, and exponential retries.
 */
export async function fetchSource(
  targetUrl: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  // Prevent running in browser context
  if (typeof window !== "undefined") {
    throw new Error("fetchSource must only be called in a server-side execution context");
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return {
      success: false,
      url: targetUrl,
      finalUrl: targetUrl,
      detectedFormat: "UNKNOWN",
      durationMs: 0,
      redirectCount: 0,
      errorCode: "MALFORMED_URL",
      errorMessage: `Invalid URL: ${targetUrl}`
    };
  }

  // Acquire concurrency & polite rate limit token
  await rateLimiter.acquire(parsed.hostname);

  try {
    let lastResult: FetchResult | null = null;
    const retryableStatuses = new Set([408, 429, 500, 502, 503, 504]);

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      const result = await executeSingleFetch(targetUrl, options);

      if (result.success) {
        return result;
      }

      lastResult = result;

      // Check if retry is appropriate
      const isRetryableError =
        result.errorCode === "NETWORK_ERROR" ||
        result.errorCode === "TIMEOUT" ||
        (result.httpStatus && retryableStatuses.has(result.httpStatus));

      const isTerminalClientError =
        result.errorCode === "SSRF_DETECTED" ||
        result.errorCode === "UNSUPPORTED_PROTOCOL" ||
        result.errorCode === "UNSUPPORTED_CONTENT_TYPE" ||
        result.errorCode === "PAYLOAD_TOO_LARGE" ||
        result.errorCode === "SOURCE_NOT_FOUND" ||
        result.errorCode === "UNSAFE_REDIRECT" ||
        (result.httpStatus && [400, 401, 403, 404, 410].includes(result.httpStatus));

      if (isTerminalClientError || attempt === MAX_RETRY_ATTEMPTS || !isRetryableError) {
        return result;
      }

      // Exponential backoff: 1000ms for attempt 2, 2000ms for attempt 3
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((res) => setTimeout(res, backoffMs));
    }

    return (
      lastResult || {
        success: false,
        url: targetUrl,
        finalUrl: targetUrl,
        detectedFormat: "UNKNOWN",
        durationMs: 0,
        redirectCount: 0,
        errorCode: "RETRIES_EXHAUSTED",
        errorMessage: `Failed after ${MAX_RETRY_ATTEMPTS} attempts`
      }
    );
  } finally {
    rateLimiter.release(parsed.hostname);
  }
}
