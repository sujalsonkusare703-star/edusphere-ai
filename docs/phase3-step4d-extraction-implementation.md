# EduSphere AI — Phase 3 Step 4D Implementation Report
## Structured Admission Data Extraction & Validation Engine

**Document Version:** 1.0.0  
**Phase:** Phase 3 Step 4D  
**Status:** Completed & Independently Verified  
**Date:** September 2026  

---

## 1. Extraction Architecture

The Phase 3 Step 4D Structured Admission Data Extraction Engine introduces a multi-tier, hybrid extraction pipeline designed to transform unstructured web/text evidence into strongly typed candidate admission facts without polluting production tables.

```
+--------------------------------------------------------------------------------+
|                           AUTHORIZED DATA PIPELINE                             |
+--------------------------------------------------------------------------------+
                                  Official Sources
                                         ↓
                               Source Registry (Step 4A)
                                         ↓
                              Secure Fetcher (Step 4B)
                                         ↓
                           Content Normalizer (Step 4B)
                                         ↓
                        Deterministic Detector (Step 4B)
                                         ↓
                           Change Event Queue (Step 4C)
                                         ↓
                 +-----------------------------------------------+
                 |        STRUCTURED EXTRACTION ENGINE (4D)      |
                 |                                               |
                 |  Priority 1: Deterministic Domain Parsers     |
                 |              (MHT-CET, JoSAA, BITSAT,         |
                 |               VITEEE, NATA, MH CET Law)       |
                 |                                               |
                 |  Priority 2: Structured Table & Grid Parser   |
                 |                                               |
                 |  Priority 3: Server-side LLM Fallback         |
                 |              (Gemini / OpenAI + Zod Guard)    |
                 +-----------------------------------------------+
                                         ↓
                             Zod & Domain Validation
                                         ↓
                           Program Matching & Conflicts
                                         ↓
                             Staged Candidate Data
                       (Status: PARSED → PENDING_REVIEW)
                                         ↓
                    [Future Step 4E: Admin Review & Apply]
                                         ↓
                        Approved Production Tables Only
```

### Key Architectural Invariants:
1. **Candidate Staging Only:** All extracted entities are persisted strictly within `college_data_change_events.proposed_value.extracted_data`.
2. **Zero Production Mutation:** Direct writes (INSERT, UPDATE, DELETE) to `public.colleges`, `public.college_courses`, and `public.college_cutoffs` remain strictly blocked.
3. **No Automatic Approval:** No candidate fact is automatically converted to `VERIFIED` or applied to production.
4. **Baseline Preservation:** `college_source_registry.last_content_hash` continues to represent the approved baseline and is not advanced by extraction.

---

## 2. Deterministic Parsing

Deterministic parsing is the primary extraction layer. It processes known regulatory and institutional formats using rigid, verifiable regexes and grammar extractors:

| Parser Module | Authority / Scope | Extracted Metrics | Cutoff Unit |
| :--- | :--- | :--- | :--- |
| `parseMHTCETSource` | Maharashtra State CET Cell CAP | Cutoff percentiles, CAP Rounds, Home State/Other State quotas, OPEN/OBC/SC/ST categories | `percentile` (0–100) |
| `parseJoSAA` | JoSAA / CSAB (IITs, NITs, IIITs) | Opening/closing ranks, All India Quota, category ranks | `rank` (positive int) |
| `parseBITSAT` | BITS Pilani Admission Portal | Score cutoffs out of 390 marks, B.E. programs | `marks` (0–390) |
| `parseVITEEE` | VIT Vellore / Chennai | VITEEE closing rank categories | `rank` (positive int) |
| `parseNATA` | Council of Architecture (COA) / DTE | B.Arch score cutoffs out of 200 marks | `marks` (0–200) |
| `parseMHCETLaw` | State CET Cell (Law CAP) | B.A. LL.B. / LL.B. score cutoffs out of 150 marks | `score` (0–150) |
| `parseTableSource` | HTML `<table>` & Markdown Grids | Program, Category, Quota, Value, Unit, Year, Round | Contextual |

---

## 3. LLM Fallback Architecture

When source text is unstructured prose that does not match deterministic parser patterns, the system falls back to a secure, server-side LLM worker:

1. **Server-Side Only:** Invoked exclusively on the server using `process.env.GEMINI_API_KEY` (Gemini 1.5 Flash) or `process.env.OPENAI_API_KEY` (gpt-4o-mini). Zero client key exposure.
2. **Strict Schema Constraints:** The LLM is forced via system prompt and `response_mime_type: "application/json"` to output an object strictly matching `ExtractedAdmissionUpdateSchema`.
3. **Zero Student Data Sent:** The extraction engine never sends user tokens, student profiles, or application state to the model.
4. **Graceful Degradation:** If no API keys are present in the environment, `extractWithLLM` fails gracefully (`NO_LLM_PROVIDER_CONFIGURED`), allowing the deterministic system to continue functioning without crashes.

---

## 4. Zod Schemas

Candidate records are validated using runtime Zod schemas defined in `lib/services/college-updater/validation.ts`:

- `CutoffUnitSchema`: `z.enum(["percentile", "rank", "score", "marks"])`
- `CandidateRecordStatusSchema`: `z.enum(["VALID", "INVALID", "ANOMALY", "CONFLICT", "AMBIGUOUS", "NEW_DISCOVERY"])`
- `CandidateCutoffSchema`: Validates `exam`, `quota`, `category`, `value`, `unit`, `year`, `round`, `source_url`, `evidence_excerpt`, `confidence_score`, and `status`.
- `CandidateExamSchema`: Validates `accepted_exams`, `evidence_excerpt`, `confidence_score`.
- `CandidateRouteSchema`: Validates `admission_route`, `evidence_excerpt`, `confidence_score`.
- `CandidateEligibilitySchema`: Validates `eligibility_criteria`, `is_source_stated` boolean, `evidence_excerpt`.
- `CandidateProgramSchema`: Validates `program_name`, `program_code`, `matched_course_id`, `match_confidence`.
- `ExtractedAdmissionUpdateSchema`: Complete container validating all candidate categories, conflicts, anomalies, and metadata.

---

## 5. Evidence Model

Every extracted candidate fact is bound by a mandatory evidence contract:

```typescript
{
  value: 99.45,
  unit: "percentile",
  evidence_excerpt: "Computer Engineering OPEN: 99.45%ile",
  source_url: "https://cetcell.mahacet.org/cap2026",
  confidence_score: 0.95
}
```

- **Invariant:** If `evidence_excerpt` is empty or missing, the candidate fact is immediately rejected (`status: INVALID`).
- **Auditability:** Reviewers in Step 4E can inspect the exact sentence or table row from which the fact was extracted.

---

## 6. Confidence Model

Confidence scores ($0.00$ to $1.00$) represent **extraction confidence**, NOT production verification status:

- `0.95 – 1.00`: Deterministic regex/table match with exact program and exam alignment.
- `0.85 – 0.94`: Normalized string match or structured LLM response matching standard schemas.
- `0.70 – 0.84`: Partial alias match or multi-exam inference requiring human verification.
- `< 0.70`: Low-confidence or ambiguous match; flagged for review (`AMBIGUOUS`).

---

## 7. Exam Handling

The extractor strictly distinguishes entrance examinations and preserves institutional specifics:
- **MHT-CET:** Maharashtra State Quota engineering admissions.
- **JEE Main:** All India Quota engineering admissions.
- **JEE Advanced:** Exclusive undergraduate admissions for Indian Institutes of Technology (IITs).
- **BITSAT:** Exclusive admissions for BITS Pilani campuses.
- **VITEEE:** Exclusive admissions for Vellore Institute of Technology campuses.
- **NATA:** Architecture (B.Arch) admissions.
- **MH CET Law:** Maharashtra State Law admissions (5-year / 3-year LL.B.).

**Rule:** Exam conversion (e.g. converting rank $\rightarrow$ percentile or marks $\rightarrow$ percentile) is strictly forbidden.

---

## 8. Unit Handling & Strict Validation

Cutoff units are strictly validated against known bounds:

1. **`percentile`**:
   - Bounds: Strictly $0.00 \le \text{value} \le 100.00$.
   - Values $< 0$ or $> 100$ are flagged as `INVALID` / `ANOMALY`.
2. **`rank`**:
   - Bounds: Strictly positive integers ($1 \le \text{rank} \le 1,500,000$).
   - Negatives, zero, and decimals are flagged as `INVALID`.
3. **`marks` & `score`**:
   - BITSAT: $0 \le \text{marks} \le 390$. Values $> 390$ flagged as `INVALID`.
   - NATA: $0 \le \text{marks} \le 200$. Values $> 200$ flagged as `INVALID`.
   - MH CET Law: $0 \le \text{score} \le 150$. Values $> 150$ flagged as `INVALID`.
   - MHT-CET marks: $0 \le \text{marks} \le 200$ (only when source explicitly provides marks).

---

## 9. Year Handling

- **Explicit Extraction Only:** The extractor searches for explicit patterns (`2026`, `AY 2026-27`, `CAP 2025`).
- **Null Invariant:** If no academic year is explicitly present in the source text, `year = null`.
- **Prohibited:** Never default to current year (`2026`) or `current_year - 1`.

---

## 10. Round Handling

- **Explicit Extraction Only:** Extracted only when stated (`CAP Round 1`, `Round 2`, `Special Round`, `JoSAA Round 1`).
- **Null Invariant:** If no counseling round is specified, `round = null`.
- **Prohibited:** Never assume `Round 1` by default.

---

## 11. Category & Quota Handling

- **Categories:** Preserves original authority labels (`OPEN`, `OBC`, `SC`, `ST`, `EWS`, `TFWS`, `OBC-NCL`).
- **Quotas:** Identifies `Home State (HS)`, `Other State (OS)`, `All India (AI)`, and `State Quota`.
- Original shorthand prefixes (`GOPENH`, `LOPENO`) are parsed into normalized quota and category while retaining raw evidence.

---

## 12. Program Matching Strategy

The program matcher (`matchProgramNameToCourse`) compares candidate program strings against `public.college_courses` for the given `college_id`:

1. **Exact Match (Score 1.00):** Exact case-insensitive match against `course_name`.
2. **Normalized Match (Score 0.95):** Strips prefixes (`B.Tech in`, `B.E. in`, `Bachelor of`).
3. **Broad/Generic Ambiguity Guard:** If the candidate string matches multiple courses equally (e.g. `"Engineering"` matching Computer, Mechanical, and Civil), `course_id` is set to `null` and flagged as `status: AMBIGUOUS`.
4. **Low Match Threshold (< 0.80):** Set to `course_id: null` and marked `NEW_DISCOVERY`.

---

## 13. Conflict Detection

The conflict detector compares candidate updates against current Supabase records:

| Conflict Type | Example Trigger | Assigned Severity |
| :--- | :--- | :--- |
| `accepted_exams` | Candidate proposes "JEE Main" for BITS Pilani (only accepts BITSAT) | **HIGH** |
| `admission_route` | Candidate proposes "Maharashtra CAP" for BITS Pilani or VIT | **HIGH** |
| `unit` | Candidate specifies "rank" where existing cutoff is "percentile" | **HIGH** |
| `cutoff` | Candidate proposes OPEN 98.50 where existing cutoff is 99.45 | **MEDIUM** |
| `duplicate_cutoff` | Exact duplicate of existing record (same value, year, round, exam) | **LOW** |

**Rule:** The system **never** chooses a winner automatically. All conflicts are queued for administrative review.

---

## 14. Anomaly Detection

Anomalies are flagged without throwing unhandled exceptions:
- Out-of-bounds percentiles ($> 100$ or $< 0$).
- Fractional or non-positive ranks.
- Impossible exam scores exceeding maximums.
- Future academic years outside the active cycle ($> \text{currentYear} + 1$).
- Missing evidence or unrecognized exam names.

---

## 15. PDF Handling

- PDF documents detected via `.pdf` extension or `content_format: PDF` are safely routed to `handlePDFSource`.
- Returns `is_pdf: true` and `status: PENDING_PDF_REVIEW`.
- **Prohibited:** The system does not attempt ungrounded OCR hallucinations or fabricate cutoffs from binary PDFs.

---

## 16. Prompt Injection Defense

Source webpages and PDFs are treated as **untrusted user input**:
1. All extracted source text is encapsulated inside `<untrusted_source_content>` delimiters.
2. System prompts explicitly instruct LLMs that text within delimiters is passive data and cannot override system instructions or alter verification statuses.
3. Every LLM response is parsed through `JSON.parse` and validated using `ExtractedAdmissionUpdateSchema.safeParse`. Unparseable or schema-violating outputs are rejected.

---

## 17. Database Mutation Restrictions

Step 4D operates under strict write sandboxing:
- **`public.colleges`:** Read-only (0 INSERT, 0 UPDATE, 0 DELETE).
- **`public.college_courses`:** Read-only (0 INSERT, 0 UPDATE, 0 DELETE).
- **`public.college_cutoffs`:** Read-only (0 INSERT, 0 UPDATE, 0 DELETE).
- **`public.college_data_change_events`:** Staging updates only (`DETECTED` $\rightarrow$ `PARSED` $\rightarrow$ `PENDING_REVIEW`).
- **`public.college_source_registry.last_content_hash`:** UNCHANGED.

---

## 18. Test Results

All 29 test vectors were executed and verified via `scratch/test_step4d_suite.cjs`:

```
==================================================
RUNNING PHASE 3 STEP 4D TEST SUITE (29 VECTORS)
==================================================

✅ PASS: [1] 1. MHT-CET percentile extraction
✅ PASS: [2] 2. JEE Main rank extraction
✅ PASS: [3] 3. JEE Advanced rank extraction
✅ PASS: [4] 4. NATA marks /200
✅ PASS: [5] 5. BITSAT marks /390
✅ PASS: [6] 6. MH CET Law score /150
✅ PASS: [7] 7. Year extraction
✅ PASS: [8] 8. Missing year
✅ PASS: [9] 9. Round extraction
✅ PASS: [10] 10. Missing round
✅ PASS: [11] 11. Category extraction
✅ PASS: [12] 12. Quota extraction
✅ PASS: [13] 13. Program matching
✅ PASS: [14] 14. Ambiguous program matching
✅ PASS: [15] 15. Accepted exam conflict
✅ PASS: [16] 16. Route conflict
✅ PASS: [17] 17. Unit mismatch
✅ PASS: [18] 18. Impossible percentile
✅ PASS: [19] 19. Impossible rank
✅ PASS: [20] 20. Impossible marks
✅ PASS: [21] 21. Missing evidence
✅ PASS: [22] 22. Deterministic parser
✅ PASS: [23] 23. LLM fallback validation
✅ PASS: [24] 24. LLM malformed response
✅ PASS: [25] 25. LLM unavailable
✅ PASS: [26] 26. PDF extraction failure
✅ PASS: [27] 27. Duplicate candidate
✅ PASS: [28] 28. Event status transition
✅ PASS: [29] 29. Existing production data unchanged

==================================================
TEST RESULTS: 29 PASSED, 0 FAILED (TOTAL 29)
==================================================
```

Across all update system suites:
- Step 4B Suite: 36/36 PASSED
- Step 4C Suite: 18/18 PASSED
- Step 4D Suite: 29/29 PASSED
- **Total: 83/83 PASSED**

---

## 19. Lint Results

Executed: `npm run lint`  
Status: **0 errors, 0 warnings**.

---

## 20. Build Results

Executed: `npm run build`  
Status: **Compiled successfully in 2.2s**. 15/15 static and dynamic pages generated.

---

## 21. Known Limitations

1. **Complex Scanned PDFs:** Image-only scanned circulars without text layers cannot be deterministically extracted; they remain flagged as `PENDING_PDF_REVIEW` for manual upload.
2. **Heuristic Quota Labels:** Obscure sub-quotas (e.g. defense category sub-priorities like DEF1/DEF2) require administrative mapping.
3. **Multi-Column PDF Tables:** Highly irregular PDF table layouts are safer when deferred to the Step 4E admin UI rather than guessing column coordinates.

---

## 22. Requirements for Step 4E (Admin Verification & Application)

Phase 3 Step 4E will implement:
1. **Admin Review Interface:** Side-by-side visual diff showing existing vs proposed values, verbatim evidence snippets, and confidence scores.
2. **Conflict Resolution UI:** Allows an administrator to approve or reject conflicting exam, route, eligibility, or cutoff candidates.
3. **Safe Production Mutation:** Only upon explicit administrative approval will updates be written to `colleges`, `college_courses`, or `college_cutoffs`.
4. **Baseline Hash Advancement:** `college_source_registry.last_content_hash` will be updated to the approved hash upon application.
5. **Full Audit Logging:** Persistence of reviewer identity, decision timestamps, and justification in `college_audit_log`.
