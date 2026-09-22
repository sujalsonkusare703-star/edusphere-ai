# EduSphere AI — Automated College Intelligence Update System
## Phase 3 Step 4: Architecture Audit & Comprehensive Implementation Plan
**Document Version:** 1.0.0  
**Date:** 2026-09-22  
**Status:** ARCHITECTURE AUDIT & DESIGN ONLY (Strictly Read-Only — Zero Source Code, Database, or Deployment Modifications)  
**Authoritative Reference:** `docs/college-admission-verification-audit.md` & `docs/phase3-step3-college-intelligence-integration-audit.md`

---

## 1. Executive Summary [PROPOSED]

This document establishes the authoritative technical architecture, schema specifications, and implementation plan for the **Automated College Intelligence Update System** in EduSphere AI. 

EduSphere AI currently serves an admission dataset consisting of 59 institutions, 224 programs, and 154 cutoff records. Today, these records are updated via curated, verified SQL migrations. The goal of this architecture is to establish an end-to-end automated monitoring and verification pipeline:

$$\\text{Official Sources / Portals} \\xrightarrow{\\text{Fetcher}} \\text{Normalization & Hashing} \\xrightarrow{\\text{Change Detection}} \\text{Extraction Pipeline} \\xrightarrow{\\text{Review Queue}} \\text{Human Verification} \\xrightarrow{\\text{Atomic Mutation}} \\text{Live Supabase DB}$$

### 1.1 Core Invariant: Zero Direct Production Writes
The central safety tenet of this architecture is **Human-in-the-Loop (HITL) Verification**. Under no circumstances will automated scrapers, crawlers, or AI extraction pipelines write or alter production records directly in `public.colleges`, `public.college_courses`, or `public.college_cutoffs`. All detected changes enter an isolated staging and review queue (`public.college_data_change_events`) where every delta must be explicitly approved by an authorized administrator before being committed atomically to production.

### 1.2 Summary of Strategic Architectural Decisions
1. **Live Database Baseline:** Supabase PostgreSQL hosts exactly **59 colleges** (30 `VERIFIED`, 29 `DERIVED`), **224 courses** (57 `VERIFIED`, 156 `DERIVED`, 11 `INVALID`), and **154 cutoffs** (143 `DERIVED`, 11 `INVALID`, with 0 assumed years and 0 assumed rounds).
2. **Schema Precision Bottleneck Identified:** `public.college_cutoffs.cutoff_open/obc/sc/st` is typed as `NUMERIC(5,2)` (maximum value 999.99). While optimal for percentiles (e.g., 99.85) and scaled test marks, it **will overflow and throw a database exception** on All India Ranks (e.g., AIR 14,520 in JEE Main / JAC Delhi / KEA). A widening migration to `NUMERIC(10,2)` or unconstrained `NUMERIC` is mandatory before rank ingestion can occur.
3. **URL Provenance Realities:** 82 distinct URLs exist across colleges and courses. Certain legacy rows feature slash-concatenated or spaced URLs (e.g., `https://www.coeptech.ac.in / https://cetcell.mahacet.org`), requiring URL normalization and decomposition into dedicated child source records in the source registry.
4. **Execution & Scheduling Recommendation:** **Vercel Cron + Secure Next.js API Routes** authenticated via high-entropy `CRON_SECRET` bearer tokens and utilizing a dedicated server-only `SUPABASE_SERVICE_ROLE_KEY`. This keeps all extraction logic, rate-limit state, and Zod schemas within the existing Next.js / TypeScript codebase while avoiding edge runtime memory limits or external unmanaged microservices.

---

## 2. Existing College Intelligence Architecture [EXISTING]

The existing EduSphere AI college architecture consists of a client-side data access layer backed by Supabase PostgreSQL, paired with a static TypeScript dataset fallback:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Supabase PostgreSQL                           │
│  - public.colleges (59 rows, RLS public read-only)                      │
│  - public.college_courses (224 rows, unique course_id, RLS read-only)   │
│  - public.college_cutoffs (154 rows: 143 DERIVED, 11 INVALID)           │
│  - public.college_programs (normalized canonical degree list)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Client Data Access (lib/supabase/opportunities.ts)        │
│  - fetchColleges(): Queries Supabase via createClient() [@supabase/ssr] │
│  - Fallback: lib/data/edusphere-colleges-dataset.ts                     │
│  - Mapping: mapDatabaseCollege(), resolveProgramUrlInfo()               │
└────────┬───────────────────────────┬───────────────────────────┬────────┘
         │                           │                           │
         ▼                           ▼                           ▼
┌──────────────────┐    ┌───────────────────────┐   ┌────────────────────┐
│ College Listing  │    │ College Details UI    │   │ AI Recommendations │
│ app/colleges/    │    │ app/colleges/[id]/    │   │ lib/ai-guidance.ts │
│ page.tsx +       │    │ page.tsx              │   │ app/recommendations│
│ CollegeCard.tsx  │    │ - Overview metrics    │   │ page.tsx           │
│ - Verified badges│    │ - Verification alerts │   │ - Score weighting  │
│ - Program badges │    │ - Cutoff matrices     │   │ - Cutoff bounds    │
└──────────────────┘    └───────────────────────┘   └────────────────────┘
```

### 2.1 Architectural Characteristics:
- **Client Read Model:** College listing and details pages are Next.js Client Components (`"use client"`), fetching data on mount through `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Row Level Security (RLS):** Policies on `colleges`, `college_courses`, and `college_cutoffs` allow `SELECT` for all users (`true`), but reject any client-side `INSERT`, `UPDATE`, or `DELETE`.
- **Zero Background Ingestion:** Currently, no automated cron jobs, webhooks, or scrapers exist in the codebase. All updates to date have been manually prepared via SQL migration scripts.

---

## 3. Live Database Baseline State [EXISTING]

An authoritative live query of the Supabase PostgreSQL database confirms the exact baseline data distribution:

### 3.1 Entity Counts & Verification Status
| Entity | Total Count | `VERIFIED` | `DERIVED` | `INVALID` | Unverified / Null |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Colleges** (`public.colleges`) | **59** | 30 (50.8%) | 29 (49.2%) | 0 | 0 |
| **College Courses** (`public.college_courses`) | **224** | 57 (25.4%) | 156 (69.6%) | 11 (4.9%) | 0 |
| **College Cutoffs** (`public.college_cutoffs`) | **154** | 0 (0.0%)* | 143 (92.9%) | 11 (7.1%) | 0 |

**Note: While 57 college courses are VERIFIED for admission route/exams, their underlying CAP cutoff values remain classified as DERIVED pending official Round-by-Round portal archives, with 11 misattributed records strictly suppressed as INVALID.*

### 3.2 Cutoff Year & Round Integrity
- **Assumed Years:** `0` records have an assumed year (`year IS NULL` across all 154 rows).
- **Assumed Rounds:** `0` records have an assumed round (`round IS NULL` across all 154 rows).
- **Exam Distribution:** All 154 cutoff rows are currently tagged with `exam = 'MHT-CET'`.

### 3.3 Institutional Coverage Breakdown
- **National Autonomous Tier:** BITS Pilani (BITSAT), VIT Vellore (VITEEE), IIIT Hyderabad (JEE Main / UGEE), DTU (JAC Delhi CRL Rank), RV College of Engineering (KEA KCET / COMEDK UGET).
- **Maharashtra State Autonomous / University Tier:** COEP Technological University, VJTI Mumbai, SPIT Mumbai, PICT Pune, Walchand College of Engineering Sangli, MIT-WPU Pune, PCCOE Pune, Cummins College of Engineering for Women.
- **Suppressed Invalid Records (11):** Army Institute of Technology (AIT) Pune (5 engineering courses citing MHT-CET instead of JEE Main Army quota); Symbiosis Law School Pune (3 BA LLB/BBA LLB courses citing MHT-CET instead of SLAT); Bharati Vidyapeeth New Law College (3 law courses citing engineering MHT-CET).

---

## 4. URL & Source Provenance Audit [EXISTING / REQUIRES IMPLEMENTATION]

A complete audit of all source URLs across the 59 colleges and 224 courses was conducted:

### 4.1 URL Categorization & Ingestion Viability
| Category | Unique URLs | Target Authorities | Ingestion Viability | Fetch Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Category A: Structured Dedicated Portals** | 28 | BITS Admission, VIT Admissions, IIIT-H Portals, DTU Admissions, Manipal Portals | **HIGH** | Selector-based HTML parsing, periodic DOM diffing |
| **Category B: Centralized Exam Authorities** | 8 | State CET Cell Maharashtra, KEA Karnataka, JAC Delhi, JoSAA/CSAB | **MEDIUM-LOW** | PDF circular monitoring, CAP seat allotment table parsing |
| **Category C: Institutional Main Portals** | 46 | College `.ac.in` / `.edu.in` root and subpages | **MEDIUM** | Deep-link crawling to `/admissions`, sitemap XML inspection |

### 4.2 Malformed & Concatenated URLs Identified [REQUIRES IMPLEMENTATION]
Certain rows in `public.colleges` store multiple URLs concatenated with slashes or spaces:
1. `COEP Technological University`: `https://www.coeptech.ac.in / https://cetcell.mahacet.org`
2. `Walchand College of Engineering`: `http://www.walchandsangli.ac.in / https://cetcell.mahacet.org`

**Required Normalization Rule:** Before automated fetching, the ingestion engine must sanitize and decompose multi-URL fields into discrete primary and secondary source records within the new Source Registry table.

---

## 5. Schema Constraints & Ingestion Feasibility [EXISTING / REQUIRES IMPLEMENTATION]

### 5.1 Cutoff Numeric Precision Risk (`NUMERIC(5,2)`) [REQUIRES IMPLEMENTATION]
- **Existing Constraint:** `college_cutoffs.cutoff_open`, `cutoff_obc`, `cutoff_sc`, `cutoff_st` are defined as `NUMERIC(5, 2)`.
- **The Problem:** The maximum value that can be stored in `NUMERIC(5,2)` is `999.99`.
- **Consequence:** 
  - Valid percentiles (e.g., `99.85`) and scaled test scores (e.g., BITSAT `310.00`) succeed.
  - **All India Ranks (AIR)** (e.g., DTU CSE cutoff rank `4850`, IIIT-H CSE rank `1650`, NIT Trichy rank `12400`) **will cause immediate PostgreSQL overflow errors** (`numeric field overflow`).
- **Proposed Schema Fix (Section 26):** Alter cutoff columns to `NUMERIC(10,2)` or unconstrained `NUMERIC` to support integer ranks up to 99,999,999 alongside decimal percentiles.

### 5.2 Missing Timestamps on Colleges Table [REQUIRES IMPLEMENTATION]
- **Existing Constraint:** `public.colleges` lacks `created_at` and `updated_at` columns (they exist on `college_courses` and `college_cutoffs`).
- **Proposed Schema Fix:** Add `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()` with an `auto_update_timestamp` trigger.

### 5.3 Row Level Security & Service Role Access [EXISTING]
- **Existing Constraint:** Public access is strictly read-only.
- **Ingestion Requirement:** Automated workers and admin approval actions cannot execute under the public `anon` role. Ingestion workers must run exclusively in protected server-side execution contexts using `SUPABASE_SERVICE_ROLE_KEY`.

---

## 6. Source Registry Design (`college_source_registry`) [PROPOSED]

To manage URLs dynamically without hardcoding them in scrapers, a dedicated registry table must track every authoritative endpoint, its expected structure, update cadence, and health status.

### 6.1 Proposed Table Schema: `college_source_registry`
```sql
CREATE TABLE IF NOT EXISTS public.college_source_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'OFFICIAL_PORTAL', 'ADMISSION_PAGE', 'EXAM_AUTHORITY', 'NOTIFICATION_CIRCULAR', 'FEE_STRUCTURE'
    )),
    content_format TEXT NOT NULL CHECK (content_format IN ('HTML', 'PDF', 'JSON')),
    selector_config JSONB DEFAULT '{}'::jsonb,
    check_frequency_days INTEGER NOT NULL DEFAULT 7,
    last_checked_at TIMESTAMPTZ,
    last_changed_at TIMESTAMPTZ,
    last_content_hash TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.2 Key Attributes:
- **`selector_config`:** Stores CSS selectors or XPath expressions targeting specific DOM containers (e.g., `{"cutoff_container": ".admission-table", "eligibility_box": "#eligibility-criteria"}`).
- **`check_frequency_days`:** Dynamic polling cadence (e.g., daily during peak admission months May–August; weekly/bi-weekly during off-peak periods).
- **`consecutive_failures`:** Circuit-breaker counter to disable malfunctioning scrapers after 5 consecutive errors.

---

## 7. Fetching & Ingestion Engine Design [PROPOSED]

The ingestion engine is designed as an asynchronous, non-blocking fetcher tailored for educational institutional portals.

### 7.1 Networking & Request Configuration
- **HTTP Client:** Node.js native `fetch` with `AbortController` timeout handling (15,000 ms timeout per endpoint).
- **User-Agent Header:** Configured as `EduSphereBot/1.0 (+https://edusphere-ai.vercel.app/bot; academic-intelligence@edusphere.ai)`.
- **Headers:** Standard browser emulation headers (`Accept`, `Accept-Language`, `Sec-Fetch-Dest`) to prevent false-positive Cloudflare/WAF bot blocks on academic portals.
- **Rate Limiting & Concurrency:** Concurrency capped at 3 simultaneous requests, with a minimum 2,000 ms polite delay between requests to the same origin host.
- **Robots.txt Adherence:** Pre-flight robots.txt checks to ensure compliant scraping.

### 7.2 PDF Circular Handling Pipeline
Because state entrance authorities (CET Cell, JoSAA, KEA) publish cutoffs and seat allocations in PDF format:
- For `content_format = 'PDF'`, the engine downloads the document buffer in chunks.
- Content is extracted into structured text using `pdf-parse` or an isolated serverless OCR fallback.
- PDF documents are hashed via SHA-256 to prevent redundant re-parsing of identical circulars.

---

## 8. Content Normalization & Hashing [PROPOSED]

To avoid false-positive change alerts caused by dynamic banners, timestamps, CSRF tokens, or advertisement carousels, raw content undergoes strict normalization prior to hashing.

```
┌────────────────────────────────────────────────────────┐
│                   Raw HTML / PDF Text                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 DOM Tree Purification                 │
│  - Strip <script>, <style>, <nav>, <footer>, <svg>    │
│  - Remove timestamps, cache-busters, session tokens   │
│  - Target selector_config container if defined        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Whitespace & Text Canonicalization       │
│  - Collapse multiple spaces/tabs to single space       │
│  - Normalize Unicode characters & non-breaking spaces  │
│  - Strip dynamic advertisement query parameters        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            SHA-256 Content Hash Calculation            │
│  crypto.createHash('sha256').update(cleaned).digest()  │
└────────────────────────────────────────────────────────┘
```

### Hash Invariant:
If `SHA256(cleanedContent) === last_content_hash`, the source is declared unchanged, `last_checked_at` is updated, and the run terminates with zero further processing or database overhead.

---

## 9. Change Detection Engine [PROPOSED]

When the computed hash differs from `last_content_hash`, the Change Detection Engine evaluates the severity and category of the delta.

### 9.1 Multi-Tier Change Classification
1. **Low-Signal Delta (Minor Text / Style Change):** Diff ratio < 5% with no detected admission keywords. Classified as informational; no review ticket generated.
2. **Medium-Signal Delta (Eligibility / Fee / Route Update):** Keywords detected: `eligibility`, `aggregate`, `admission process`, `counselling`, `exam`. Triggers `PENDING_REVIEW` change event.
3. **High-Signal Delta (Cutoff / Seat Matrix / Merit List Release):** Keywords detected: `cutoff`, `allotment`, `opening rank`, `closing rank`, `percentile`, `cap round`, `merit list`. Immediately generates high-priority change events and notifies reviewers.

---

## 10. Change Event Queue Design (`college_data_change_events`) [PROPOSED]

The event queue buffers all detected changes, isolating unverified raw data from live tables.

### 10.1 Proposed Table Schema: `college_data_change_events`
```sql
CREATE TABLE IF NOT EXISTS public.college_data_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.college_source_registry(id) ON DELETE CASCADE,
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.college_courses(course_id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'ADMISSION_ROUTE_UPDATE', 'ELIGIBILITY_CRITERIA_UPDATE',
        'ACCEPTED_EXAMS_UPDATE', 'CUTOFF_DATA_RELEASE', 'SOURCE_URL_REDIRECT', 'NEW_PROGRAM_DISCOVERED'
    )),
    previous_value JSONB,
    proposed_value JSONB NOT NULL,
    diff_summary TEXT,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (
        'DETECTED', 'PARSED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED', 'ERROR'
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

### 10.2 State Machine Lifecycle:
$$\\text{DETECTED} \\xrightarrow{\\text{AI / Rule Parser}} \\text{PARSED} \\xrightarrow{\\text{Safety Checks}} \\text{PENDING\\_REVIEW} \\xrightarrow{\\text{Admin Review}} \\begin{cases} \\text{APPROVED} \\xrightarrow{\\text{Atomic Mutator}} \\text{APPLIED} \\\\ \\text{REJECTED} \\end{cases}$$

---

## 11. Data Extraction Pipeline [PROPOSED]

The extraction pipeline transforms unformatted HTML/PDF text into strongly typed, schema-validated JSON.

### 11.1 Hybrid Extraction Architecture
1. **Primary Layer: Deterministic Regex & Tabular Parser:** Specialized parsers for standard tabular layouts (e.g., CET Cell merit tables with columns: Merit No, Application ID, Candidate Name, Gender, Category, Score, Percentile).
2. **Fallback Layer: LLM Structured Extraction (Google Gemini / OpenAI):** For free-form text announcements and unstructured HTML paragraphs, the raw text is passed to an LLM with strict response schemas.

### 11.2 Zod Validation Schema for Proposed Extracted Records
```typescript
import { z } from "zod";

export const ExtractedAdmissionUpdateSchema = z.object({
  college_id: z.string().min(1),
  course_id: z.string().optional(),
  accepted_exams: z.array(z.string()).min(1).optional(),
  admission_route: z.string().min(5).optional(),
  eligibility_criteria: z.string().min(10).optional(),
  cutoffs: z.array(z.object({
    exam: z.string(),
    quota: z.string().default("General"),
    category_open: z.number().nullable().optional(),
    category_obc: z.number().nullable().optional(),
    category_sc: z.number().nullable().optional(),
    category_st: z.number().nullable().optional(),
    cutoff_unit: z.enum(["percentile", "rank", "score", "marks"]),
    year: z.number().int().min(2020).max(2028),
    round: z.string().min(1)
  })).optional(),
  source_url: z.string().url(),
  confidence_score: z.number().min(0).max(1)
});
```

---

## 12. Verification & Safety Workflow [PROPOSED]

### 12.1 Mandatory Invariant: Human-in-the-Loop Review
Under no configuration may automated ingestion bypass human oversight. Every proposed change to an existing college, course, or cutoff record must be explicitly reviewed in the Admin UI.

### 12.2 Verification Status Transition Rules
- When an approved change is committed, the target row's `admission_verification_status` transitions to **`VERIFIED`**.
- The `admission_source_name` and `admission_source_url` are updated to match the authoritative origin.
- The `last_verified_at` timestamp is set to `now()`.

---

## 13. Cutoff Unit & Rank Safety [PROPOSED]

To prevent catastrophic ranking logic corruptions (e.g., interpreting a lower rank number as a lower percentile score), strict unit boundaries and validation rules are enforced:

### 13.1 Unit Guardrails
| Cutoff Unit | Valid Range | Monotonic Direction | Interpretation | Validation Rule |
| :--- | :--- | :--- | :--- | :--- |
| **`percentile`** | `0.00` – `100.00` | Higher is Better | Percentage of candidates scored below | Fail if value > 100 or value < 0 |
| **`rank`** | `1` – `1,500,000` | **Lower is Better** | All India Rank (AIR) or State Merit Rank | Fail if value < 1 or value is a non-integer float |
| **`marks` / `score`** | `0` – Exam Max | Higher is Better | Absolute score (e.g., BITSAT /390, MHT-CET /200) | Fail if value > Exam Maximum |

### 13.2 Automated Unit Sanity Check Algorithm
```typescript
function validateCutoffUnit(unit: string, value: number, exam: string): boolean {
  if (unit === "percentile") {
    return value >= 0 && value <= 100;
  }
  if (unit === "rank") {
    return Number.isInteger(value) && value >= 1 && value <= 1500000;
  }
  if (unit === "marks" || unit === "score") {
    const maxScores: Record<string, number> = {
      "BITSAT": 390,
      "JEE Main": 300,
      "MHT-CET": 200,
      "VITEEE": 125,
      "UGEE": 150
    };
    const max = maxScores[exam] || 500;
    return value >= 0 && value <= max;
  }
  return false;
}
```

---

## 14. Category & Quota Mapping Rules [PROPOSED]

Standardized mapping maps heterogeneous authority category labels into canonical database fields:

### 14.1 Canonical Mapping Matrix
| Authority Label (e.g. CET Cell / JoSAA) | Canonical Category Column | Canonical Quota Tag |
| :--- | :--- | :--- |
| `GOPENS`, `LOPENS`, `AI`, `OPEN`, `General` | `cutoff_open` | `Home State` / `Other State` / `All India` |
| `GOBCS`, `LOBCS`, `OBC`, `OBC-NCL` | `cutoff_obc` | `Home State` / `Other State` |
| `GSCS`, `LSCS`, `SC` | `cutoff_sc` | `Home State` / `Other State` |
| `GSTS`, `LSTS`, `ST` | `cutoff_st` | `Home State` / `Other State` |
| `EWS` (Economically Weaker Section) | *Future Column: `cutoff_ews`* | `State Quota` |
| `TFWS` (Tuition Fee Waiver Scheme) | *Future Column: `cutoff_tfws`* | `State Quota` |

---

## 15. Multi-Exam & Route Disambiguation [PROPOSED]

Institutions frequently accept multiple entrance routes for distinct courses or seat categories.

### 15.1 Route Conflict Resolution Hierarchy
1. **Program-Level Override Takes Absolute Precedence:** If a specific course in `public.college_courses` specifies `accepted_exams = ['JEE Main', 'UGEE']` (e.g., IIIT Hyderabad Dual Degree), this overrides the college-wide default.
2. **Disambiguation by Category:**
   - **BITS Pilani:** `BITSAT` exclusively (do not allow automated scrapers to infer JEE Main).
   - **VIT Vellore:** `VITEEE` exclusively for B.Tech.
   - **DTU:** `JEE Main` via `JAC Delhi Counselling` (ranks in CRL, not state percentiles).
   - **COEP / VJTI:** Dual route (`MHT-CET` for 85% Home State seats; `JEE Main` for 15% All India seats).

---

## 16. Conflict Detection & Rejection Engine [PROPOSED]

The engine automatically flags and blocks suspect updates before they can reach the reviewer:

### 16.1 Anomaly Traps:
1. **Cutoff Plunge / Spike Trap:** A cutoff percentile delta exceeding $\\pm 20\\%$ year-over-year for the same program and category is flagged with `ALERT: UNUSUAL_VOLATILITY`.
2. **Unit Inversion Trap:** Flags any event where an incoming value for `rank` is `< 100` (suspicion of decimal percentile mistaken for rank) or `percentile` is `> 100`.
3. **Invalid Year Jump:** Proposed year must equal $current\\_year$ or $current\\_year - 1$. Jumps forward (e.g., 2027 in 2026) are rejected.
4. **Duplicate Record Collision:** If an identical `(course_id, exam, year, round)` already exists, the event is marked as `DUPLICATE_FOUND` to prompt overwrite confirmation.

---

## 17. Admin Reviewer Interface Design [PROPOSED]

An authenticated administrative review view at `/admin/college-updates` allows administrators to review, compare, approve, or reject changes:

```
┌────────────────────────────────────────────────────────────────────────┐
│ EduSphere AI — College Intelligence Review Queue                       │
│ [Filter: All (14) | Pending Review (8) | Approved (4) | Rejected (2)]  │
├────────────────────────────────────────────────────────────────────────┤
│ College: COEP Technological University                                 │
│ Course: Computer Engineering (COEP-UG-CE)                             │
│ Source: https://cetcell.mahacet.org (State CET Cell CAP Round 1 2025)   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Current Production Values        │ Proposed Extracted Values           │
│ - Status: DERIVED                │ - Status: VERIFIED                  │
│ - Accepted Exams: [MHT-CET]      │ - Accepted Exams: [MHT-CET, JEE]    │
│ - OPEN Cutoff: 99.82 (Year: NULL)│ - OPEN Cutoff: 99.88 (Year: 2025)   │
│ - Round: NULL                    │ - Round: CAP Round 1                │
├──────────────────────────────────┴─────────────────────────────────────┤
│ [Reject with Reason...]                     [Approve & Apply to Live DB]│
└────────────────────────────────────────────────────────────────────────┘
```

### 17.1 Reviewer Controls:
- Side-by-side Visual Diff highlighting changed tokens in green/red.
- One-click source verification link (opens cached snapshot and original source URL in new tab).
- Editable correction form allowing the admin to fine-tune values prior to approving.

---

## 18. Production Database Mutation Engine [PROPOSED]

When an administrator approves a change event, the Production Database Mutation Engine applies the updates inside a single, atomic PostgreSQL transaction.

### 18.1 Atomic Mutation & Audit Logging
```sql
-- Conceptual Atomic Mutation Function
CREATE OR REPLACE FUNCTION public.apply_approved_college_update(
    p_event_id UUID,
    p_admin_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_event RECORD;
BEGIN
    SELECT * INTO v_event FROM public.college_data_change_events 
    WHERE id = p_event_id AND status = 'APPROVED';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event % not found or not in APPROVED status', p_event_id;
    END IF;

    -- 1. Insert snapshot into immutable audit log
    INSERT INTO public.college_audit_log (
        event_id, college_id, course_id, modified_by, before_state, after_state
    ) VALUES (
        v_event.id, v_event.college_id, v_event.course_id, p_admin_user_id,
        v_event.previous_value, v_event.proposed_value
    );

    -- 2. Execute target mutation based on event_type
    -- (Updates public.colleges, public.college_courses, or public.college_cutoffs)
    
    -- 3. Mark event as APPLIED
    UPDATE public.college_data_change_events
    SET status = 'APPLIED', applied_at = now()
    WHERE id = p_event_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 19. Execution & Scheduling Architecture Comparison [PROPOSED]

To determine the optimal scheduling strategy, four industry options were evaluated against EduSphere AI's architecture:

| Architecture Option | Pros | Cons | Recommendation |
| :--- | :--- | :--- | :--- |
| **Option 1: Vercel Cron + Next.js API Routes** | - Seamless deployment in existing Next.js repo.<br>- Leverages shared TypeScript models & Zod schemas.<br>- Zero additional infrastructure or DevOps overhead. | - Max execution time 60s (hobby) / 300s (pro) per invocation.<br>- Must batch college checks in chunks of 5–10. | **RECOMMENDED (Primary)** |
| **Option 2: Supabase pg_cron + pg_net** | - Runs entirely inside PostgreSQL.<br>- Zero external compute dependencies. | - Cannot parse complex DOM/PDF documents easily inside SQL.<br>- Exposes DB connection to outbound network delays. | **NOT RECOMMENDED** |
| **Option 3: GitHub Actions Scheduled Workflows** | - Long execution window (up to 6 hours).<br>- Free runner minutes on public/private repos. | - High scheduling jitter (can delay up to 45 mins).<br>- Decoupled from application deployment lifecycle. | **VIABLE ALTERNATIVE** |
| **Option 4: External Microservice Worker (Modal / AWS ECS)**| - Unconstrained CPU/RAM, full Playwright/Puppeteer support. | - Introduces high complexity, multi-cloud monitoring, and added costs. | **OVERKILL for Phase 3** |

### Definitive Recommendation:
**Vercel Cron** invoking a protected Next.js API route (`/api/cron/check-sources`) in batches of 10 colleges per run. For PDF-heavy or headless-browser sites, GitHub Actions runs an auxiliary nightly job that pushes parsed events into `/api/ingestion/events`.

---

## 20. Security & Access Control Model [PROPOSED]

### 20.1 Credential Isolation
- **`SUPABASE_SERVICE_ROLE_KEY`:** Must strictly reside in server-side environment variables (`.env.local` / Vercel Secrets). Never prefixed with `NEXT_PUBLIC_`.
- **`CRON_SECRET`:** A 64-character high-entropy secret passed in the `Authorization: Bearer <CRON_SECRET>` header to authorize cron execution.

### 20.2 Admin Role Enforcement
- Admin pages (`/admin/*`) and review API endpoints (`/api/admin/updates/*`) verify that `auth.jwt() -> app_metadata -> role === 'admin'`. Public anonymous or standard student accounts receive `403 Forbidden`.

---

## 21. Error Handling, Retries & Dead Letter Queue [PROPOSED]

### 21.1 Retry Strategy with Exponential Backoff
- On HTTP `5xx` or connection timeout, the fetcher retries up to 3 times with exponential backoff: $delay = 2^{\\text{attempt}} \\times 1000\\text{ ms}$.
- On HTTP `404 Not Found` or `410 Gone`, retries are immediately aborted; the source record is flagged as `NEEDS_URL_AUDIT`.

### 21.2 Circuit Breaker
- When `consecutive_failures >= 5`, the source record is set to `is_active = false` and an alert is logged to prevent hammering dead institutional servers.

---

## 22. Observability, Logging & Alerting [PROPOSED]

- **Structured JSON Logging:** All scraper runs log structured payloads (`timestamp`, `source_id`, `status`, `duration_ms`, `http_status`, `hash_changed`).
- **Reviewer Notification Webhooks:** Configured via Discord/Slack webhook (`ADMIN_ALERT_WEBHOOK_URL`) when high-signal cutoff events are queued for review.

---

## 23. Dataset Fallback & Offline Sync Strategy [EXISTING / PROPOSED]

- The live Supabase database is the **Primary Source of Truth**.
- `lib/data/edusphere-colleges-dataset.ts` serves as the **Offline Static Fallback** for local development or database failover.
- **Sync CLI Script:** An offline utility `scripts/sync-static-dataset.ts` reads the verified Supabase records and updates `edusphere-colleges-dataset.ts` upon command, ensuring zero drift between database and code repository.

---

## 24. Automated Test Plan & Test Scenarios [PROPOSED]

The automated update system requires automated testing across five key vectors before deployment:
1. **Mock HTML Ingestion Test:** Verifies that known HTML fixtures parse cleanly into expected Zod structures.
2. **Content Hash Stability Test:** Confirms identical content produces identical hashes despite dynamic whitespace or timestamp insertion.
3. **Unit Validation Guardrail Test:** Verifies that invalid ranks (>1.5M), negative percentiles, or out-of-range marks throw Zod validation errors.
4. **Queue State Transition Test:** Verifies that change events strictly follow `DETECTED` $\\to$ `PENDING_REVIEW` $\\to$ `APPROVED` $\\to$ `APPLIED`.
5. **Regression Verification Test:** Ensures no updates to the existing 59 colleges break frontend rendering or cause Next.js build errors.

---

## 25. Step-by-Step Phased Implementation Roadmap [PROPOSED]

```
Phase 3 Step 4 Implementation Roadmap:
┌───────────────────────────────────────────────────────────┐
│ Step 4A: Schema DDL & Source Registry Ingestion           │
│ - Create college_source_registry & change event tables    │
│ - Seed registry with normalized URLs for the 59 colleges  │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4B: Ingestion Engine Core & Normalizer               │
│ - Build server-side fetcher, timeout & user-agent wrapper │
│ - Implement HTML/PDF normalization & SHA-256 hash checks  │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4C: Change Detection & Event Queue Service           │
│ - Detect content deltas and generate change event records │
│ - Implement unit & anomaly safety validation rules        │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4D: AI & Rule-Based Extraction Pipelines             │
│ - Implement Zod schema extractors with LLM fallback       │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4E: Admin Verification UI & Review Portal            │
│ - Build /admin/college-updates dashboard & diff viewer    │
│ - Secure with Supabase Admin Auth & atomic commit RPC     │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4F: Scheduler & Cron Integration                     │
│ - Configure /api/cron/check-sources with CRON_SECRET      │
│ - Add vercel.json cron schedule                           │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Step 4G: End-to-End Pilot & Live Rollout                  │
│ - Pilot run on 5 verified national portals (BITS/VIT/etc.)│
│ - Full production rollout across all 59 institutions      │
└───────────────────────────────────────────────────────────┘
```

---

## 26. Complete Proposed Schema Definitions (DDL) [PROPOSED / REQUIRES IMPLEMENTATION]

> [!IMPORTANT]
> **READ-ONLY SPECIFICATION ONLY:** The following SQL definitions are architectural specifications for future implementation phases. **DO NOT EXECUTE** this SQL during Phase 3 Step 4.

```sql
-- 1. Alter college_cutoffs to support large All India Ranks without numeric overflow
ALTER TABLE public.college_cutoffs 
    ALTER COLUMN cutoff_open TYPE NUMERIC(10,2),
    ALTER COLUMN cutoff_obc TYPE NUMERIC(10,2),
    ALTER COLUMN cutoff_sc TYPE NUMERIC(10,2),
    ALTER COLUMN cutoff_st TYPE NUMERIC(10,2);

-- 2. Add audit timestamps to colleges
ALTER TABLE public.colleges 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Source Registry Table
CREATE TABLE IF NOT EXISTS public.college_source_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'OFFICIAL_PORTAL', 'ADMISSION_PAGE', 'EXAM_AUTHORITY', 'NOTIFICATION_CIRCULAR', 'FEE_STRUCTURE'
    )),
    content_format TEXT NOT NULL CHECK (content_format IN ('HTML', 'PDF', 'JSON')),
    selector_config JSONB DEFAULT '{}'::jsonb,
    check_frequency_days INTEGER NOT NULL DEFAULT 7,
    last_checked_at TIMESTAMPTZ,
    last_changed_at TIMESTAMPTZ,
    last_content_hash TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Change Events Queue Table
CREATE TABLE IF NOT EXISTS public.college_data_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.college_source_registry(id) ON DELETE CASCADE,
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES public.college_courses(course_id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'ADMISSION_ROUTE_UPDATE', 'ELIGIBILITY_CRITERIA_UPDATE',
        'ACCEPTED_EXAMS_UPDATE', 'CUTOFF_DATA_RELEASE', 'SOURCE_URL_REDIRECT', 'NEW_PROGRAM_DISCOVERED'
    )),
    previous_value JSONB,
    proposed_value JSONB NOT NULL,
    diff_summary TEXT,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (
        'DETECTED', 'PARSED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED', 'ERROR'
    )),
    rejection_reason TEXT,
    reviewer_id UUID,
    reviewed_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    raw_payload_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Immutable Audit Log Table
CREATE TABLE IF NOT EXISTS public.college_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.college_data_change_events(id) ON DELETE SET NULL,
    college_id TEXT NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id TEXT,
    modified_by UUID,
    before_state JSONB,
    after_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_source_registry_college ON public.college_source_registry(college_id);
CREATE INDEX IF NOT EXISTS idx_source_registry_active ON public.college_source_registry(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_change_events_status ON public.college_data_change_events(status);
CREATE INDEX IF NOT EXISTS idx_change_events_college ON public.college_data_change_events(college_id);
```

---

## 27. Environment Variables & File System Impact Analysis [PROPOSED]

### 27.1 Required New Environment Variables (Server-Side Only)
| Variable Name | Purpose | Scope | Security Sensitivity |
| :--- | :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend service key for atomic updates & bypassing public RLS | Server Only | **CRITICAL** (Never expose to client) |
| `CRON_SECRET` | 64-char secret to authenticate Vercel Cron invocations | Server Only | **HIGH** |
| `ADMIN_ALERT_WEBHOOK_URL` | Optional Slack/Discord webhook for ingestion alerts | Server Only | **MEDIUM** |

### 27.2 Planned Future File Additions (No Existing Files Overwritten)
- `lib/services/college-updater/fetcher.ts`: Robust HTTP & User-Agent client.
- `lib/services/college-updater/normalizer.ts`: DOM cleaner and SHA-256 hasher.
- `lib/services/college-updater/detector.ts`: Semantic change detector.
- `lib/services/college-updater/extractor.ts`: Zod schema parser with LLM fallback.
- `app/api/cron/check-sources/route.ts`: Vercel Cron endpoint.
- `app/admin/college-updates/page.tsx`: Admin review interface.
- `scripts/sync-static-dataset.ts`: CLI offline sync script.

### 27.3 Verification of Zero Regression
The proposed update system is strictly additive and server-isolated. No changes affect the student-facing catalog (`app/colleges/page.tsx`), college details views (`app/colleges/[id]/page.tsx`), user profiles, saved items, career recommendations, or AI chat assistants.
