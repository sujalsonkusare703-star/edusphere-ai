# EduSphere AI — Automated College Intelligence Update System
## Phase 3 Step 4B: Source Fetcher, Content Normalization & Change Detection Implementation Report
**Document Version:** 1.0.0  
**Date:** 2026-09-22  
**Status:** IMPLEMENTED & VERIFIED  
**Parent Reference:** [`docs/phase3-step4-automated-college-update-audit.md`](phase3-step4-automated-college-update-audit.md)  
**Foundation Reference:** [`docs/phase3-step4a-source-registry-implementation.md`](phase3-step4a-source-registry-implementation.md)

---

## Executive Summary

Phase 3 Step 4B implements the server-side source checking pipeline for EduSphere AI. The system safely monitors authoritative educational endpoints without mutating production college intelligence or invoking external LLMs:

$$\text{Source Registry} \xrightarrow{\text{fetchSource()}} \text{Safe Fetcher (SSRF + Rate Limits)} \xrightarrow{\text{normalizeHtml()}} \text{Canonical Text} \xrightarrow{\text{SHA-256}} \text{Hash Comparison} \xrightarrow{\text{classifySignal()}} \text{Change Report}$$

In strict accordance with Phase 3 Step 4B constraints:
- **Zero Production Mutations:** `public.colleges`, `public.college_courses`, and `public.college_cutoffs` remain completely untouched.
- **Zero Automation Schedulers:** No Vercel Cron (`vercel.json`), GitHub Actions, or background timers were introduced.
- **Zero AI Extractions:** No Gemini or OpenAI API calls; classification is deterministic and rule-based.
- **Zero Admin UI:** All administrative interfaces are deferred to Step 4E.
- **Only Allowed Write:** Safe updating of monitoring metadata (`last_checked_at`, `last_changed_at`, `last_content_hash`, `consecutive_failures`) on `public.college_source_registry`.

---

## 1. Files Created [IMPLEMENTED]

| File Path | Description |
| :--- | :--- |
| [`lib/services/college-updater/types.ts`](../lib/services/college-updater/types.ts) | TypeScript interfaces for `FetchResult`, `NormalizedResult`, `SourceCheckResult`, `SelectorConfig`, `SignalLevel`, and `DetectionStatus`. |
| [`lib/services/college-updater/fetcher.ts`](../lib/services/college-updater/fetcher.ts) | Server-side native HTTP fetcher with SSRF validation, AbortController timeouts, manual redirect checking, 10MB streaming size limits, polite rate limiting, and exponential retries. |
| [`lib/services/college-updater/normalizer.ts`](../lib/services/college-updater/normalizer.ts) | HTML cleaner, DOM noise stripper (scripts, styles, navs, footers, cookie banners), session token sanitizer, entity decoder, and deterministic SHA-256 hasher. |
| [`lib/services/college-updater/detector.ts`](../lib/services/college-updater/detector.ts) | Change detection engine, keyword signal classifier (`HIGH_SIGNAL`, `MEDIUM_SIGNAL`, `LOW_SIGNAL`), first-check baseline establisher, and safe registry metadata mutator. |
| [`lib/services/college-updater/index.ts`](../lib/services/college-updater/index.ts) | Clean module export aggregator for the updater services. |

---

## 2. Files Modified [IMPLEMENTED]

| File Path | Description of Modifications |
| :--- | :--- |
| [`types/index.ts`](../types/index.ts) | Exported `DetectionStatus`, `SignalLevel`, and `SourceCheckResult` interfaces for application-wide typing. |

---

## 3. Fetch Architecture & Pipeline [IMPLEMENTED]

The source fetcher runs strictly server-side (`typeof window === "undefined"`) using Node.js native `fetch`. It operates with strict separation between network operations and data mutation:

```
[Target Source URL]
       │
       ▼
[SSRF Pre-Flight Check] ──(Unsafe)──► [Reject: SSRF_DETECTED / UNSUPPORTED_PROTOCOL]
       │
    (Safe)
       ▼
[Polite Rate Limiter] ──► Max 3 Global Concurrency / Min 2,000ms per Host
       │
       ▼
[Native Fetch Execution] ──► Manual Redirect Inspection (Max 5 hops)
       │
       ├──(3xx Redirect)──► [SSRF Check on Destination URL] ──► Follow
       │
       ├──(408, 429, 5xx)──► [Exponential Backoff Retry] (Attempts 1 to 3)
       │
       ├──(404, 410)───────► [Return: SOURCE_NOT_FOUND] (No retry)
       │
       └──(200 OK)─────────► [Content-Type & 10MB Size Verification]
                                     │
                                     ▼
                            [Body Buffer / Text]
```

---

## 4. SSRF Protection & Security Rules [IMPLEMENTED]

To prevent Server-Side Request Forgery (SSRF) against internal services, cloud metadata endpoints, or loopback interfaces, `validateSafeUrl` enforces the following rules prior to dispatching any request:

1. **Protocol Allowlist:**
   - **Allowed:** Strictly `https:`.
   - **Rejected:** `http:`, `ftp:`, `file:`, `javascript:`, `data:`.
2. **Loopback & Localhost Rejection:**
   - Blocks `localhost`, `*.localhost`, `127.0.0.1`, `::1`, `0.0.0.0`.
3. **Private & Reserved IPv4 Blocks:**
   - Blocks `10.0.0.0/8` (Private).
   - Blocks `172.16.0.0/12` (Private: `172.16.0.0` – `172.31.255.255`).
   - Blocks `192.168.0.0/16` (Private).
   - Blocks `169.254.0.0/16` (Link-local & AWS/GCP Instance Metadata `169.254.169.254`).
   - Blocks `100.64.0.0/10` (Carrier-grade NAT).
   - Blocks `224.0.0.0/4` and `240.0.0.0/4` (Multicast and Reserved).
4. **Special & Private IPv6 Blocks:**
   - Blocks `::1` (Loopback).
   - Blocks `fe80::/10` (Link-local).
   - Blocks `fc00::/7` (Unique-local).
   - Blocks `::ffff:0:0/96` (IPv4-mapped IPv6).
5. **Non-FQDN Target Rejection:**
   - Hostnames without dots (e.g., `https://internal-db`, `https://metadata`) are immediately rejected.
6. **Redirect-Based SSRF Protection:**
   - `fetch` is executed with `redirect: "manual"`.
   - On `301`, `302`, `303`, `307`, or `308`, the target `Location` header is parsed and fully re-evaluated through `validateSafeUrl` before following. Redirects to localhost or private IPs are blocked with `UNSAFE_REDIRECT`.

---

## 5. Timeout Handling [IMPLEMENTED]

- **Default Timeout:** 15,000 milliseconds (15 seconds) per request.
- **Mechanism:** `AbortController` signal passed to `fetch` with an active `setTimeout` handle.
- **Failure Behavior:** If aborted due to timeout:
  - Error code: `TIMEOUT`
  - Error message: `"Request timed out after 15000ms"`
  - Structured error object returned; no unhandled promise rejections or server crashes.

---

## 6. Retry Strategy & Exponential Backoff [IMPLEMENTED]

- **Maximum Attempts:** 3 (1 initial execution + 2 retries).
- **Retryable Errors:**
  - Network connection failures (DNS timeouts, connection resets).
  - HTTP `408 Request Timeout`
  - HTTP `429 Too Many Requests`
  - HTTP `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`
- **Backoff Interval:**
  - Attempt 1: Immediate.
  - Attempt 2: 1,000 ms backoff.
  - Attempt 3: 2,000 ms backoff.
- **Terminal (Non-Retryable) Errors:**
  - Client errors: HTTP `400`, `401`, `403`.
  - Missing resources: HTTP `404`, `410` (returns `SOURCE_NOT_FOUND`).
  - Security blocks: `SSRF_DETECTED`, `UNSUPPORTED_PROTOCOL`, `UNSUPPORTED_CONTENT_TYPE`, `PAYLOAD_TOO_LARGE`.

---

## 7. Polite Rate Limiting & Concurrency [IMPLEMENTED]

- **Origin Polite Delay:** Minimum 2,000 ms (2 seconds) between consecutive requests to the same hostname. A hostname tracking map (`Map<string, number>`) enforces this delay.
- **Global Concurrency Ceiling:** Maximum 3 concurrent outbound HTTP requests across all domains simultaneously.
- **Queueing Mechanism:** Excess requests wait in a FIFO queue until an active request slot is released.

---

## 8. Response Size Limits [IMPLEMENTED]

- **Maximum Allowed Payload:** 10 MB (`10,485,760` bytes).
- **Pre-Flight Header Check:** If the `Content-Length` header exceeds 10 MB, the request is aborted immediately before streaming.
- **Active Stream Counter:** If `Content-Length` is absent, response chunks are counted incrementally. If the accumulated byte count crosses 10 MB, `reader.cancel()` is triggered, returning `PAYLOAD_TOO_LARGE`.

---

## 9. Content-Type Handling [IMPLEMENTED]

| Format | Content-Type Patterns | Ingestion Strategy in Step 4B |
| :--- | :--- | :--- |
| **`HTML`** | `text/html`, `application/xhtml+xml` | Fully normalized into text, stripped of noise, and hashed via SHA-256. |
| **`PDF`** | `application/pdf` | Magic bytes validated (`%PDF-`), buffer hashed via SHA-256; marked as `PENDING_PDF_EXTRACTION` (extraction deferred to Step 4D). |
| **`JSON`** | `application/json`, `text/json` | Whitespace canonicalized and hashed via SHA-256. |
| **`UNSUPPORTED`** | Images, videos, binaries, audio | Rejected with `UNSUPPORTED_CONTENT_TYPE`. |

---

## 10. HTML Content Normalization Pipeline [IMPLEMENTED]

The normalizer transforms dynamic, noisy HTML into stable canonical text:

1. **Selector Targeting:** If `selector_config` specifies a container (e.g. `{"cutoff_container": ".admission-table"}`), extraction targets that specific container; otherwise, falls back to the full page.
2. **Noise Tag Removal:** Strips `<script>`, `<style>`, `<noscript>`, `<svg>`, `<nav>`, `<footer>`, and HTML comments (`<!-- ... -->`).
3. **Cookie / Modal Removal:** Strips containers matching `cookie`, `consent`, `gdpr`, `popup`, and `banner-modal`.
4. **Session Sanitization:** Redacts session IDs, tokens (`phpsessid`, `session_id`, `csrf_token`), and tracking parameters (`utm_source`, `cacheBuster`, `_t`).
5. **Ephemeral Timestamp Filtering:** Strips dynamic timestamps like `"Page generated on: ..."` and `"Last refreshed at: ..."` while strictly preserving academic admission deadlines (e.g. `"Application deadline: 30 June 2026"`).
6. **Structure & Entity Decoding:** Converts block elements (`<p>`, `<div>`, `<tr>`, `<li>`) to line breaks (`\n`), converts table cells to column separators (` | `), and decodes all HTML entities (`&nbsp;`, `&amp;`, `&lt;`, etc.).
7. **Unicode & Whitespace Canonicalization:** Applies Unicode `NFKC` normalization, collapses duplicate spaces/tabs, and trims lines.

---

## 11. Deterministic Hashing [IMPLEMENTED]

- **Algorithm:** SHA-256 via Node.js native `crypto.createHash("sha256")`.
- **Output:** 64-character lowercase hexadecimal string.
- **Determinism Guarantee:** Identical normalized text produces an identical hash across runs, platforms, and Node.js versions.

---

## 12. Change Detection Engine [IMPLEMENTED]

The detector compares the freshly computed hash against the stored `last_content_hash`:

| Scenario | Detection Status | Hash Changed? | Action Taken |
| :--- | :--- | :--- | :--- |
| `last_content_hash IS NULL` | **`FIRST_CHECK`** | `false` | Baseline hash recorded; zero change alert or event generated. |
| `currentHash === previousHash` | **`UNCHANGED`** | `false` | Content confirmed identical; `last_checked_at` updated. |
| `currentHash !== previousHash` | **`CHANGED`** | `true` | Delta confirmed; text scanned for keywords; signal level classified. |
| Target format is PDF | **`PENDING_PDF_EXTRACTION`** | Conditional | PDF buffer hashed; text extraction deferred to Step 4D. |
| Fetch or network failure | **`ERROR`** | `false` | Error captured; previous hash and changed timestamp strictly preserved. |

---

## 13. Signal Classification Rules [IMPLEMENTED]

When content changes, the detector assigns a deterministic signal level:

- **`HIGH_SIGNAL`:** Triggered when the delta contains admission-critical keywords:  
  `cutoff`, `closing rank`, `opening rank`, `percentile`, `merit list`, `cap round`, `seat allotment`, `seat matrix`, `round 1`, `round 2`, `round 3`.
- **`MEDIUM_SIGNAL`:** Triggered when general admission policy keywords are detected:  
  `admission`, `eligibility`, `entrance exam`, `counselling`, `application form`, `deadline`, `fee structure`, `intake`, `b.tech`.
- **`LOW_SIGNAL`:** General institutional news, campus updates, or general webpage edits without admission terms.

---

## 14. Database Fields Allowed to Change [IMPLEMENTED]

Only monitoring metadata on **`public.college_source_registry`** is allowed to be updated:
- `last_checked_at` (set to `now()` on every check).
- `last_changed_at` (set to `now()` only when `status === 'CHANGED'`).
- `last_content_hash` (updated on `FIRST_CHECK` or `CHANGED`).
- `consecutive_failures` (reset to `0` on success; incremented on `ERROR`).
- `updated_at` (set to `now()`).

---

## 15. Database Fields Explicitly Protected [UNCHANGED]

The following tables and fields are **strictly read-only** and completely untouched:
- **`public.colleges`:** All 59 colleges, names, locations, fees, placement stats, admission routes, verification statuses.
- **`public.college_courses`:** All 224 courses, stream classifications, intakes, program URLs, verified routes.
- **`public.college_cutoffs`:** All 154 cutoff values, categories, exams, and verified/derived statuses.
- **Student Data:** User profiles, student profiles, skills, saved items, recommendations, and AI assistant logs.

---

## 16. Test Suite Results [IMPLEMENTED]

A dedicated 36-vector test suite evaluated all components:

| Category | Tests Run | Result |
| :--- | :--- | :--- |
| **SSRF Protection & Protocol Safety** | 12 tests | ✅ **12 / 12 PASSED** |
| **Content Normalizer & Hashing** | 6 tests | ✅ **6 / 6 PASSED** |
| **Change Detection & Signal Classification** | 5 tests | ✅ **5 / 5 PASSED** |
| **Mock HTTP Fetcher Scenarios** | 8 tests | ✅ **8 / 8 PASSED** |
| **Live Supabase Database Invariants** | 5 tests | ✅ **5 / 5 PASSED** |
| **Total Test Suite** | **36 tests** | ✅ **36 / 36 PASSED (100%)** |

---

## 17. Security Test Results [IMPLEMENTED]

| Target URL / Scheme | Threat Vector Tested | Result |
| :--- | :--- | :--- |
| `http://example.com` | Unencrypted plain HTTP | ✅ **REJECTED** (`UNSUPPORTED_PROTOCOL`) |
| `javascript:alert(1)` | URI scheme attack | ✅ **REJECTED** (`UNSUPPORTED_PROTOCOL`) |
| `file:///etc/passwd` | Local filesystem read | ✅ **REJECTED** (`UNSUPPORTED_PROTOCOL`) |
| `data:text/html,...` | Embedded data URI | ✅ **REJECTED** (`UNSUPPORTED_PROTOCOL`) |
| `https://localhost` | Local loopback hostname | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://127.0.0.1` | IPv4 loopback | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://[::1]` | IPv6 loopback | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://10.0.1.5` | Private IPv4 (10.0.0.0/8) | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://192.168.1.100` | Private IPv4 (192.168.0.0/16) | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://169.254.169.254` | AWS/GCP Metadata link-local | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://database-service` | Non-FQDN internal hostname | ✅ **REJECTED** (`SSRF_DETECTED`) |
| `https://domain` $\rightarrow$ `localhost` | Redirect-based SSRF | ✅ **INTERCEPTED & BLOCKED** (`UNSAFE_REDIRECT`) |

---

## 18. Build & Lint Results [IMPLEMENTED]

1. **ESLint Static Analysis:**
   - Command: `npm run lint`
   - Output: `0 errors, 0 warnings` (Impeccably clean).
2. **Next.js Production Build:**
   - Command: `npm run build`
   - Output: `15/15` pages and dynamic routes generated successfully in 2.2s with 0 errors.

---

## 19. Known Limitations [IMPLEMENTED]

1. **PDF Text Extraction:** PDF documents are hashed in raw binary to detect new releases, but text parsing is deferred (`PENDING_PDF_EXTRACTION`). Step 4D will integrate a dedicated PDF extraction service.
2. **Single-Page DOM Scope:** Scrapes the registered source URL directly without following unverified internal links.
3. **No Numerical Diffing Yet:** Does not attempt to infer numerical cutoff changes; signal classification is keyword-based.

---

## 20. Step 4C Requirements [NOT IMPLEMENTED]

Step 4B establishes the fetcher, normalizer, and detector services. The following components remain for **Phase 3 Step 4C**:
- **Change Event Queue (`public.college_data_change_events`):** Staging table to buffer detected changes.
- **Event Dispatcher:** Writing detected changes into the queue in `DETECTED` status.
- **Sanity & Anomaly Guards:** Traps for extreme percentage swings or out-of-bounds cutoffs before reaching human reviewers.
