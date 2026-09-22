# EduSphere AI — Automated College Intelligence Update System
## Phase 3 Step 4C: Change Event Queue & Staging Layer Implementation Report
**Document Version:** 1.0.0  
**Date:** 2026-09-22  
**Status:** IMPLEMENTED & VERIFIED  
**Authoritative Migration File:** [`lib/supabase/phase3_step4c_change_events.sql`](../lib/supabase/phase3_step4c_change_events.sql)  
**Parent Reference:** [`docs/phase3-step4-automated-college-update-audit.md`](phase3-step4-automated-college-update-audit.md)  
**Step 4B Reference:** [`docs/phase3-step4b-source-checker-implementation.md`](phase3-step4b-source-checker-implementation.md)

---

## Executive Summary

Phase 3 Step 4C establishes the isolated staging layer and event queue (`public.college_data_change_events`) for EduSphere AI. The staging layer buffers and deduplicates detected admission changes before human review:

$$\text{Official Sources} \xrightarrow{\text{Fetcher}} \text{Normalizer} \xrightarrow{\text{Change Detector}} \mathbf{\text{Change Event Queue [Step 4C]}} \xrightarrow{\text{Reviewer UI}} \text{Live Supabase DB}$$

In strict compliance with Phase 3 Step 4C safety invariants:
- **Zero Automatic Production Updates:** No scrapers or detectors write to `public.colleges`, `public.college_courses`, or `public.college_cutoffs`.
- **Zero AI Hallucinations:** Changed raw HTML is stored as raw detection metadata in `proposed_value`; structured cutoffs, exams, or years are **not** fabricated in this step.
- **Baseline Hash Preservation:** The approved baseline hash in `college_source_registry.last_content_hash` is preserved upon change detection, preventing detected changes from prematurely disappearing.
- **Deterministic Deduplication:** Repeated checks against the same changed hash do not spawn duplicate queue records.
- **Strict Row Level Security:** Public and anonymous clients are prevented from inserting, updating, or deleting change events.

---

## 1. Schema Created [IMPLEMENTED]

The staging table `public.college_data_change_events` isolates detected changes from live tables:

```sql
CREATE TABLE IF NOT EXISTS public.college_data_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.college_source_registry(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id INT REFERENCES public.college_courses(course_id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'ADMISSION_ROUTE_UPDATE',
        'ELIGIBILITY_CRITERIA_UPDATE',
        'ACCEPTED_EXAMS_UPDATE',
        'CUTOFF_DATA_RELEASE',
        'SOURCE_URL_REDIRECT',
        'NEW_PROGRAM_DISCOVERED'
    )),
    previous_value JSONB,
    proposed_value JSONB NOT NULL,
    diff_summary TEXT,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (
        'DETECTED',
        'PARSED',
        'PENDING_REVIEW',
        'APPROVED',
        'REJECTED',
        'APPLIED',
        'ERROR'
    )),
    rejection_reason TEXT,
    reviewer_id UUID,
    reviewed_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    raw_payload_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Event Types [IMPLEMENTED]

Step 4C supports 6 initial event types enforced via a database `CHECK` constraint:

| Event Type | Triggering Condition | Behavior in Step 4C |
| :--- | :--- | :--- |
| **`CUTOFF_DATA_RELEASE`** | `HIGH_SIGNAL` keywords detected (`cutoff`, `closing rank`, `CAP round`, `percentile`, `merit list`). | Staged as candidate cutoff event; **no cutoffs inserted into live database**. |
| **`ADMISSION_ROUTE_UPDATE`** | `MEDIUM_SIGNAL` keywords detected relating to admission processes, routes, or counselling. | Staged as candidate admission route event. |
| **`ELIGIBILITY_CRITERIA_UPDATE`** | Detected keywords specifically indicate eligibility, aggregate percentages, or subject requirements. | Staged as candidate criteria update. |
| **`ACCEPTED_EXAMS_UPDATE`** | Detected keywords indicate entrance exams (BITSAT, MHT-CET, JEE Main, etc.). | Staged as candidate exam list update. |
| **`SOURCE_URL_REDIRECT`** | Fetcher detects HTTP redirect (`finalUrl !== sourceUrl`). | Staged for review; **trusted registry URL is NOT automatically replaced**. |
| **`NEW_PROGRAM_DISCOVERED`** | Future or rule-based parser detects new degree or branch. | Staged for review; **no row added to `college_courses`**. |

---

## 3. Status Machine & Transition Validation [IMPLEMENTED]

The lifecycle of each event is governed by a state machine that rejects invalid transitions:

```
[DETECTED] ──► [PARSED] ──► [PENDING_REVIEW] ──► [APPROVED] ──► [APPLIED (Terminal)]
    │              │                 │
    ▼              ▼                 ▼
 [ERROR]        [ERROR]         [REJECTED (Terminal)]
```

### Transition Validation Rules:
- From **`DETECTED`**: Can transition to `PARSED`, `PENDING_REVIEW`, `ERROR`.
- From **`PARSED`**: Can transition to `PENDING_REVIEW`, `ERROR`.
- From **`PENDING_REVIEW`**: Can transition to `APPROVED`, `REJECTED`, `ERROR`.
- From **`APPROVED`**: Can transition to `APPLIED`, `ERROR`.
- From **`REJECTED`**: Terminal state (no further transitions allowed).
- From **`APPLIED`**: Terminal state (no further transitions allowed).
- From **`ERROR`**: Can transition to `DETECTED` upon retry.
- Any illegal transition (e.g. `APPLIED` $\rightarrow$ `DETECTED`, `REJECTED` $\rightarrow$ `APPLIED`) is rejected with a validation error.

---

## 4. Deterministic Deduplication Strategy [IMPLEMENTED]

To prevent polling jobs from generating duplicate events when a source remains changed relative to its baseline:

1. Before creating an event, `findExistingOpenEvent(supabase, sourceId, currentHash)` checks for an existing record matching:
   - `source_id = target_source_id`
   - `status IN ('DETECTED', 'PARSED', 'PENDING_REVIEW')`
   - `proposed_value->>'currentHash' = current_detected_hash`
2. If an open event already exists for this exact hash, `createChangeEvent` skips database insertion and returns `{ success: true, data: existingEvent, deduplicated: true }`.
3. If the content changes again to a **different** hash, a new event is cleanly created.

---

## 5. Evidence Storage & 50KB Snippet Limit [IMPLEMENTED]

- **`raw_payload_snippet` Ceiling:** Snippets are capped at **50 KB** (`50 * 1024` bytes) using `truncateSnippet`. Any excess text is cleanly truncated with `...[TRUNCATED_AT_50KB]` to prevent PostgreSQL buffer bloat.
- **Traceability Metadata:** Every event stores:
  - `sourceUrl` and `finalUrl`
  - `previousHash` (baseline) and `currentHash` (detected)
  - `detectedKeywords` list
  - `detectedAt` timestamp
  - `diff_summary`

---

## 6. Baseline Hash Strategy [IMPLEMENTED]

In Step 4C, the relationship between the baseline hash and the detected hash was refined:
- **`college_source_registry.last_content_hash`:** Represents the **Last Known Good / Approved Baseline Hash**.
- When `checkSource()` returns `CHANGED`:
  - `last_changed_at` is updated to record the detection.
  - `last_checked_at` is updated.
  - **`last_content_hash` IS NOT OVERWRITTEN.**
- Preserving the baseline hash ensures that subsequent polls continue to recognize that the source has diverged from baseline until an administrator approves the event in Step 4E.

---

## 7. Step 4B Integration & Signal Filtering [IMPLEMENTED]

The event service orchestrates the detection and staging pipeline:

1. **`FIRST_CHECK`:** Baseline hash recorded on initial run; **zero change events created**.
2. **`UNCHANGED`:** `last_checked_at` updated; **zero change events created**.
3. **`LOW_SIGNAL` Changes:** General institutional news or wording adjustments with no admission keywords are **monitored only** (`last_checked_at` and `last_changed_at` updated) but produce **zero review noise**.
4. **`MEDIUM_SIGNAL` & `HIGH_SIGNAL` Changes:** Mapped to appropriate `ChangeEventType` and staged in the queue.
5. **`ERROR`:** Fetch failures increment `consecutive_failures` without erasing the baseline hash; no event created unless source health warrants it.

---

## 8. Row Level Security (RLS) Policies [IMPLEMENTED]

```sql
ALTER TABLE public.college_data_change_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to college_data_change_events" 
ON public.college_data_change_events FOR SELECT USING (true);
```

### Security Guarantees:
- Public anonymous and student clients have read-only (`SELECT`) visibility.
- Public `INSERT`, `UPDATE`, and `DELETE` operations are completely forbidden and blocked with PostgreSQL error `42501`.
- Production mutations are restricted to authorized server-side execution contexts.

---

## 9. Performance Indexes [IMPLEMENTED]

- `idx_change_events_source_id` ON `public.college_data_change_events(source_id)`
- `idx_change_events_college_id` ON `public.college_data_change_events(college_id)`
- `idx_change_events_status` ON `public.college_data_change_events(status)`
- `idx_change_events_created_at` ON `public.college_data_change_events(created_at DESC)`
- `idx_change_events_pending` ON `public.college_data_change_events(created_at DESC) WHERE status IN ('DETECTED', 'PARSED', 'PENDING_REVIEW')`

---

## 10. TypeScript Types [IMPLEMENTED]

Exported from `types/index.ts` and `lib/services/college-updater/types.ts`:

```typescript
export type ChangeEventType =
  | "ADMISSION_ROUTE_UPDATE"
  | "ELIGIBILITY_CRITERIA_UPDATE"
  | "ACCEPTED_EXAMS_UPDATE"
  | "CUTOFF_DATA_RELEASE"
  | "SOURCE_URL_REDIRECT"
  | "NEW_PROGRAM_DISCOVERED";

export type ChangeEventStatus =
  | "DETECTED"
  | "PARSED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED"
  | "ERROR";

export interface CollegeDataChangeEvent {
  id: string;
  source_id: string;
  college_id: string;
  course_id?: number | null;
  event_type: ChangeEventType;
  previous_value?: Record<string, unknown> | null;
  proposed_value: Record<string, unknown>;
  diff_summary?: string | null;
  status: ChangeEventStatus;
  rejection_reason?: string | null;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  applied_at?: string | null;
  raw_payload_snippet?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

---

## 11. Event Service Functions [IMPLEMENTED]

Located in [`lib/services/college-updater/change-events.ts`](../lib/services/college-updater/change-events.ts):
- `createChangeEvent()`: Inserts new change events with deduplication checks.
- `findExistingOpenEvent()`: Queries active open events by source and hash.
- `updateChangeEventStatus()`: Updates lifecycle status with transition validation.
- `getPendingChangeEvents()`: Queries pending events for administrator review.
- `processAndQueueSourceCheck()`: Coordinates end-to-end check, baseline preservation, and event queueing.

---

## 12. Test Suite Results [IMPLEMENTED]

A 18-vector test suite validated all Step 4C requirements:

| # | Test Scenario | Expected Behavior | Result |
| :--- | :--- | :--- | :--- |
| 1 | First check handling | Baseline hash established, zero change events | ✅ **PASS** |
| 2 | Unchanged content | `UNCHANGED` status, zero change events | ✅ **PASS** |
| 3 | High-signal cutoff change | Creates `CUTOFF_DATA_RELEASE` event | ✅ **PASS** |
| 4 | Medium-signal criteria change | Creates `ELIGIBILITY_CRITERIA_UPDATE` event | ✅ **PASS** |
| 5 | Low-signal news change | Monitoring-only, zero review queue noise | ✅ **PASS** |
| 6 | Duplicate event prevention | Same changed hash skips duplicate insertion | ✅ **PASS** |
| 7 | Multiple distinct hashes | Produces distinct change events | ✅ **PASS** |
| 8 | Source URL redirect | Priority mapped to `SOURCE_URL_REDIRECT` | ✅ **PASS** |
| 9 | New program event format | Creates `NEW_PROGRAM_DISCOVERED` event | ✅ **PASS** |
| 10 | Cutoff release staging | Staged in queue without mutating live tables | ✅ **PASS** |
| 11 | Invalid status transition | `APPLIED` $\rightarrow$ `DETECTED` rejected | ✅ **PASS** |
| 12 | Valid status transition | `DETECTED` $\rightarrow$ `PARSED` $\rightarrow$ `PENDING_REVIEW` allowed | ✅ **PASS** |
| 13 | RLS blocks public INSERT | Anonymous INSERT blocked with RLS error | ✅ **PASS** |
| 14 | RLS blocks public UPDATE | Anonymous UPDATE blocked with RLS error | ✅ **PASS** |
| 15 | RLS blocks public DELETE | Anonymous DELETE blocked with RLS error | ✅ **PASS** |
| 16 | 59 Colleges Count Invariant | 59 colleges unchanged | ✅ **PASS** |
| 17 | Courses & Cutoffs Invariant | 224 courses, 154 cutoffs unchanged | ✅ **PASS** |
| 18 | Verification Status Invariant | 30 VERIFIED, 29 DERIVED, 11 INVALID unchanged | ✅ **PASS** |

---

## 13. Build & Lint Results [IMPLEMENTED]

1. **ESLint Static Analysis:** `npm run lint` $\rightarrow$ `0 errors, 0 warnings`.
2. **Next.js Production Build:** `npm run build` $\rightarrow$ `15/15` pages and API routes compiled cleanly in 2.3s.

---

## 14. Database Invariant Results [UNCHANGED]

| Entity | Baseline Count | Post-Step 4C Count | Invariant Status |
| :--- | :--- | :--- | :--- |
| **Colleges** (`public.colleges`) | **59** | **59** | ✅ **UNCHANGED** |
| **Courses** (`public.college_courses`) | **224** | **224** | ✅ **UNCHANGED** |
| **Cutoffs** (`public.college_cutoffs`) | **154** | **154** | ✅ **UNCHANGED** |
| **Verified Colleges** | 30 | 30 | ✅ **UNCHANGED** |
| **Derived Colleges** | 29 | 29 | ✅ **UNCHANGED** |
| **Verified Courses** | 57 | 57 | ✅ **UNCHANGED** |
| **Derived Courses** | 156 | 156 | ✅ **UNCHANGED** |
| **Invalid Courses (Suppressed)** | 11 | 11 | ✅ **UNCHANGED** |
| **Derived Cutoffs** | 143 | 143 | ✅ **UNCHANGED** |
| **Invalid Cutoffs (Suppressed)** | 11 | 11 | ✅ **UNCHANGED** |
| **Assumed Years / Rounds** | 0 assumed | 0 assumed | ✅ **UNCHANGED** |

---

## 15. Known Limitations [IMPLEMENTED]

1. **Staged Values are Metadata Only:** In Step 4C, `proposed_value` contains change detection metadata (hashes, keywords, timestamps); structured tabular extraction is intentionally not performed until Step 4D.
2. **No Automatic Database Mutations:** Staged events remain in `DETECTED` / `PENDING_REVIEW` until Step 4E admin approval.

---

## 16. Exact Requirements for Step 4D [NOT IMPLEMENTED]

Step 4C establishes the staging queue. The following components remain for **Phase 3 Step 4D**:
- **Structured Data Extractor (`lib/services/college-updater/extractor.ts`):** Parsing candidate raw HTML into structured Zod schemas (`ExtractedAdmissionUpdateSchema`).
- **LLM / AI Structured Fallback:** Invoking Gemini/OpenAI with strict JSON schemas for complex narrative announcements.
- **Queue Status Progression:** Transitioning events from `DETECTED` $\rightarrow$ `PARSED` $\rightarrow$ `PENDING_REVIEW` with extracted structured payloads.
