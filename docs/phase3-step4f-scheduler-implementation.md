# EduSphere AI — Phase 3 Step 4F Implementation Report
## Automatic College Source Monitoring + Scheduler Engine

**Report Date:** September 23, 2026  
**Phase:** Phase 3 Step 4F  
**Status:** COMPLETE  
**Codebase Health:** 23/23 Step 4F Tests Passing | 33/33 Step 4E Passing | 29/29 Step 4D Passing | 18/18 Step 4C Passing | 36/36 Step 4B Passing | 0 Lint Errors | 0 TypeScript Errors | Production Build Passing  

---

### Executive Summary

Phase 3 Step 4F completes the automated monitoring foundation of the EduSphere AI College Intelligence System. The scheduler periodically queries registered official admission sources, detects upstream portal changes, normalizes extracted text, and stages candidate updates into the `PENDING_REVIEW` queue.

In strict adherence to EduSphere AI safety principles:
- **Zero Automated Production Mutations:** The scheduler never directly modifies `colleges`, `college_courses`, or `college_cutoffs`.
- **Zero Bypass of Human Approval:** Every detected change stops at `PENDING_REVIEW` in `college_data_change_events`. Production database mutations require authenticated, authorized administrator approval via the Step 4E workflow.
- **Baseline Hash Preservation:** The trusted baseline hash (`last_content_hash` in `college_source_registry`) is strictly **never advanced** upon change detection; it advances **only** when an administrator explicitly approves and applies the event in Step 4E.

---

### 1. Files Created and Modified

| File | Purpose |
|------|---------|
| `lib/supabase/phase3_step4f_scheduler.sql` | SQL schema migration adding scheduler columns (`enabled`, `check_interval_minutes`, `next_check_at`, `last_successful_check_at`, `last_error`), performance index, and admin-only RLS on change events |
| `lib/services/college-updater/scheduler.ts` | Complete scheduler engine: batch scheduling, source eligibility, pipeline orchestration, exponential backoff, and failure isolation |
| `lib/services/college-updater/index.ts` | Updated package exports for `scheduler`, `approval`, and `auth` modules |
| `app/api/cron/college-updates/route.ts` | Protected endpoint for Vercel Cron and manual triggers with `CRON_SECRET` and Admin Token authentication |
| `app/api/admin/college-sources/route.ts` | Secure admin endpoint to retrieve enriched source statuses and trigger immediate on-demand checks |
| `app/admin/college-updates/page.tsx` | Admin UI enhanced with "Monitored Sources & Health" tab, scheduler batch trigger, and single-source check actions |
| `vercel.json` | Vercel Cron configuration invoking `/api/cron/college-updates` daily at 02:00 UTC |
| `scratch/test_step4f_suite.cjs` | 23-vector comprehensive test suite validating auth, failure isolation, backoff, hash invariants, and database safety |
| `docs/phase3-step4f-scheduler-implementation.md` | Authoritative implementation report |

---

### 2. Scheduler Architecture Summary

The scheduler engine operates on a batch-oriented, fail-safe monitoring loop:

```
+-------------------------------------------------------------------------------+
|                       AUTOMATIC SCHEDULER (Step 4F)                           |
|                                                                               |
|  [Vercel Cron / Admin API]                                                    |
|           |                                                                   |
|           v                                                                   |
|  1. Authenticate Request (CRON_SECRET / Admin Role)                           |
|           |                                                                   |
|           v                                                                   |
|  2. Query Eligible Sources (is_active = true, next_check_at <= now, limit 10) |
|           |                                                                   |
|           +---> For each source (with time budget & failure isolation):       |
|           |                                                                   |
|           |     [Fetch Source (SSRF-protected, Rate-limited)]                 |
|           |                     |                                             |
|           |     [Normalize HTML Content (Strip noise, scripts, styles)]       |
|           |                     |                                             |
|           |     [Compute SHA-256 Hash vs Baseline]                            |
|           |                     |                                             |
|           |     +---------------+---------------+                             |
|           |     |                               |                             |
|           |  (UNCHANGED)                    (CHANGED)                         |
|           |     |                               |                             |
|           |  Update last_check_at               Classify Signal (HIGH/MED/LOW)|
|           |  Schedule next_check_at             |                             |
|           |                             +-------+-------+                     |
|           |                             |               |                     |
|           |                        (HIGH / MED)       (LOW)                   |
|           |                             |               |                     |
|           |                    Stage Candidate Fact   Update metadata only    |
|           |                    Status: PENDING_REVIEW (No review noise)       |
|           |                    Baseline Hash PRESERVED                        |
|           |                             |                                     |
|           |                             v                                     |
|           |                 [AWAIT STEP 4E HUMAN APPROVAL]                    |
|           |                             |                                     |
|           +-----------------------------+                                     |
+-------------------------------------------------------------------------------+
```

---

### 3. Cron Endpoint and Authentication Model

- **Route:** `GET /api/cron/college-updates` and `POST /api/cron/college-updates`
- **Dynamic Configuration:** `export const dynamic = "force-dynamic"`, `export const maxDuration = 30` (Vercel serverless budget).
- **Authentication Layers Supported:**
  1. `Authorization: Bearer <CRON_SECRET>` (Standard Vercel Cron header)
  2. `x-edusphere-admin-key: <ADMIN_API_KEY>` (Automation / Internal scripts)
  3. `Authorization: Bearer <SUPABASE_ADMIN_JWT>` (Admin user session via `app_metadata.role = "admin"`)
- **Strict Security Gate:**
  - Missing or invalid secret/token: `401 Unauthorized`.
  - Authenticated student or non-admin session: `403 Forbidden: Administrator role required`.
  - Zero client-provided target URLs: The endpoint **never** accepts arbitrary URLs from request parameters, completely eliminating SSRF via cron injection.

---

### 4. Supported Scheduling Triggers

1. **Vercel Cron Trigger:** Automated daily invocation via `vercel.json` (`0 2 * * *`).
2. **Admin UI Global Trigger:** "Run Scheduler" button on `/admin/college-updates` runs an immediate batch check of all eligible sources.
3. **Admin UI On-Demand Single Source Check:** Each source card features an individual "Check Now" button invoking `POST /api/admin/college-sources` with `{ sourceId }`.
4. **CLI / Direct Automation Trigger:** External cURL or CI/CD invocation using `CRON_SECRET` or admin header.

---

### 5. Per-Source Interval Strategy

Intervals are tailored to source volatility to avoid wasteful network requests and respect host politeness:

| Source Type | Check Interval | Rationale |
|-------------|----------------|-----------|
| `CENTRAL_COUNSELING` (e.g. JoSAA, CSAB) | 360 minutes (6 hours) | Dynamic seat allotment and counseling rounds during admission cycles |
| `STATE_COUNSELING` (e.g. MHT CET, JAC Delhi) | 720 minutes (12 hours) | Frequent merit list releases, CAP rounds, and cutoff notifications |
| `INSTITUTE_ADMISSION_PORTAL` | 1440 minutes (24 hours) | Institutional cutoff PDFs, seat matrix, and criteria updates |
| `AUTONOMOUS_EXAM_PORTAL` | 1440 minutes (24 hours) | BITSAT, VITEEE, UGEE score card and exam updates |
| `ACADEMIC_PAGE` / `NEWS_PORTAL` | 10080 minutes (7 days) | Static curriculum or general university informational updates |

---

### 6. Timeout, Retry, and Exponential Backoff Design

- **Fetcher Timeout:** 15-second strict timeout per HTTP request.
- **Retry Mechanism:** Up to 3 attempts with exponential backoff on transient network failures (502, 503, 504, connection reset).
- **Scheduler-Level Failure Backoff:**
  - Upon failure (e.g., 429 Too Many Requests, DNS error, or connection timeout), `consecutive_failures` increments.
  - The next check interval is multiplied by $2^{\min(\text{consecutive\_failures}, 5)}$ (capped at 5 days).
  - The failure reason is persisted in `last_error` for administrative inspection in the UI.
  - Upon a subsequent successful check, `consecutive_failures` and `last_error` are reset to 0 and `null`.

---

### 7. Max Runtime and Execution Budget

- **Vercel Serverless Budget:** 30 seconds maximum duration configured (`export const maxDuration = 30`).
- **Internal Scheduler Budget:** The scheduler monitors elapsed execution time and terminates batch processing if execution reaches **25,000 ms (25s)**, reserving 5 seconds for response serialization and telemetry.
- **Batch Size:** Defaults to `limit: 10` sources per execution run, preventing execution timeouts while allowing steady progression.

---

### 8. Failure Isolation Model

- **Per-Source Try-Catch Boundary:** Each source within a batch runs within an independent `try/catch/finally` block.
- **Fault Independence:** A failure, timeout, 429 rate limit, or network crash on Source A (e.g., COEP portal down) **never halts or interrupts** the monitoring of Source B, C, or D.
- **Partial Batch Success:** The scheduler records the failure on the affected source and proceeds immediately to the next source in the batch.

---

### 9. Baseline Hash Preservation

- **Invariant:** When a change is detected, `college_source_registry.last_content_hash` is **strictly NOT updated**.
- **Rationale:** If `last_content_hash` were updated upon detection, the baseline would advance prematurely. If the change event were rejected or remained unapproved, subsequent scheduler runs would perceive no diff, permanently losing the unapproved change.
- **Lifecycle Invariant:**
  1. Scheduler detects difference $\implies$ creates `college_data_change_events` in `PENDING_REVIEW`. Updates `last_changed_at`. **Leaves `last_content_hash` intact.**
  2. Step 4E Administrator reviews and approves event $\implies$ executes production mutation AND advances `college_source_registry.last_content_hash` to candidate hash.

---

### 10. Row-Level Security (RLS) Hardening

The migration `lib/supabase/phase3_step4f_scheduler.sql` applies hardened security policies:

1. `college_source_registry`:
   - `SELECT`: Public access permitted (read-only monitoring targets).
   - `INSERT`, `UPDATE`, `DELETE`: Restricted to authenticated administrators (`app_metadata.role = 'admin'`).
2. `college_data_change_events`:
   - `SELECT`: Restricted to administrators (`app_metadata.role = 'admin'`). Public/student users cannot inspect pending or historical change events.
   - `INSERT`, `UPDATE`, `DELETE`: Restricted to administrators and service role.

---

### 11. Admin Source UI and Triggers

- **Route:** `app/admin/college-updates/page.tsx`
- **Tabbed Interface:**
  1. **Change Events Queue:** Existing Step 4E approval queue with filters, side-by-side comparison, conflict warnings, manual corrections, approval, and rejection.
  2. **Monitored Sources & Health:** Grid view of all 43 registered sources displaying:
     - College name, source type, and active status badge
     - Check interval and next scheduled check countdown
     - Last checked timestamp and last changed timestamp
     - Real-time Health Badge: `HEALTHY` (green), `WARNING` (amber, 1 failure), `UNHEALTHY` (red, multiple failures or recent error), `BASELINE PENDING` (blue)
     - Error banner displaying `last_error` message and failure count
     - Pending events count badge per source
     - On-demand **"Check Now"** button triggering an instant source inspection
- **Batch Action:** Top-level **"Run Scheduler"** button with live progress indicator.

---

### 12. Vercel Cron Configuration

Configured in `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/college-updates",
      "schedule": "0 2 * * *"
    }
  ]
}
```
Executes daily at 02:00 UTC (off-peak hours for Indian institutional portals).

---

### 13. Test Suite Coverage (23 Vectors)

All 23 required test scenarios passed in `scratch/test_step4f_suite.cjs`:

| # | Test Scenario | Result |
|---|---------------|--------|
| 1 | Authorized scheduler invocation (Bearer CRON_SECRET & Admin Key) | ✅ PASS |
| 2 | Unauthorized scheduler invocation rejected with 401 | ✅ PASS |
| 3 | Empty source registry executes gracefully without errors | ✅ PASS |
| 4 | Disabled sources (`is_active = false`) are skipped | ✅ PASS |
| 5 | First check establishes baseline without creating change event | ✅ PASS |
| 6 | Unchanged source content creates no change events | ✅ PASS |
| 7 | Meaningful change detected creates change event in `PENDING_REVIEW` | ✅ PASS |
| 8 | Duplicate change hash does not create duplicate event | ✅ PASS |
| 9 | HIGH signal change creates review event | ✅ PASS |
| 10 | LOW signal change updates monitoring metadata with 0 review events | ✅ PASS |
| 11 | Fetch timeout error records failure and applies exponential backoff | ✅ PASS |
| 12 | HTTP 429 Too Many Requests records error without aborting batch | ✅ PASS |
| 13 | One failing source does not stop other sources in the batch | ✅ PASS |
| 14 | SSRF protection rejects dangerous local and private IP schemes | ✅ PASS |
| 15 | Rate and concurrency limits are configured | ✅ PASS |
| 16 | Baseline `last_content_hash` is strictly NOT advanced merely by detection | ✅ PASS |
| 17 | Scheduler execution makes zero modifications to colleges, courses, or cutoffs | ✅ PASS |
| 18 | Created change events remain in `PENDING_REVIEW` awaiting Step 4E approval | ✅ PASS |
| 19 | Student session token receives 403 Forbidden | ✅ PASS |
| 20 | RLS blocks anon/student write and update on `college_source_registry` | ✅ PASS |
| 21 | Live Supabase database: colleges count strictly equals 59 (30 VERIFIED, 29 DERIVED) | ✅ PASS |
| 22 | Live Supabase database: courses count strictly equals 224 (57 VERIFIED, 156 DERIVED, 11 INVALID) | ✅ PASS |
| 23 | Live Supabase database: cutoffs count strictly equals 154 (143 DERIVED, 11 INVALID, 0 year, 0 round) | ✅ PASS |

---

### 14. Regression Test Suite Results

- **Step 4B (Fetcher, Normalizer, Change Detection):** 36/36 PASSED
- **Step 4C (Change Event Queue, Staging):** 18/18 PASSED
- **Step 4D (Structured Extraction & Validation):** 29/29 PASSED
- **Step 4E (Admin Verification & Approval):** 33/33 PASSED
- **Step 4F (Scheduler & Monitoring):** 23/23 PASSED
- **Total Automated Test Vectors Passing:** 139 / 139 (100%)

---

### 15. Code Quality and Build Results

- **ESLint:** 0 errors, 0 warnings (`npm run lint` passed cleanly)
- **TypeScript Type Check:** 0 errors (`npx tsc --noEmit` passed cleanly)
- **Production Next.js Build:** Compiled and generated all 19 static/dynamic routes successfully (`npm run build` exited with code 0).

---

### 16. Production Database Invariants Verified

Verified against the live Supabase instance:
- **Colleges:** Exactly 59 records (30 VERIFIED, 29 DERIVED).
- **Programs / Courses:** Exactly 224 records (57 VERIFIED, 156 DERIVED, 11 INVALID).
- **Cutoffs:** Exactly 154 records (143 DERIVED, 11 INVALID, 0 assumed year, 0 assumed round).
- **Automated Production Mutations:** 0. No automated write has touched production tables.

---

### 17. Environment Variables Required

| Variable | Scope | Purpose |
|----------|-------|---------|
| `CRON_SECRET` | Production (Vercel) | Secret string matching Vercel Cron authorization header |
| `EDUSPHERE_ADMIN_KEY` | Server-side / CI | Internal admin API key for CLI or script triggers |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase service key for admin backend operations |

---

### 18. Recommended Deployment Steps

1. Apply SQL migration `lib/supabase/phase3_step4f_scheduler.sql` in the Supabase SQL Editor.
2. Set `CRON_SECRET` in Vercel Environment Variables.
3. Deploy the project to Vercel.
4. Verify the Cron job registered under the Vercel Project Dashboard > Cron Jobs tab.
5. Log in as an administrator on `/admin/college-updates` and review the "Monitored Sources & Health" tab.

---

### 19. Completion Status

Phase 3 Step 4F is fully implemented, verified, and ready for production deployment. All automated scheduling, source health tracking, and isolation capabilities are operational without compromising data integrity or bypassing human verification.
