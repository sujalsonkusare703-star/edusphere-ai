# EduSphere AI — Authoritative Project Context & Technical Memory

## CURRENT PROJECT STATE

- **Phase**: Final testing / finalization
- **Completed Major Phases**:
  1. **Phase 2, Step 1**: Real Supabase Authentication (Signup, Login, Sessions, Logout, Protected Routes)
  2. **Phase 2, Step 2**: Real Student Profile Database Integration (`profiles`, `student_profiles`, `student_skills`)
  3. **Phase 2, Step 3**: Real CGPA Persistence (`student_profiles.cgpa` bounds [0.00, 10.00])
  4. **Phase 2, Step 4A–4D**: Real Opportunity Database, Seeding, and Discovery Pages (`colleges`, `internships`, `placements`)
  5. **Phase 2, Step 5**: Safe Removal of Remaining Demo Data Dependencies (Supabase authoritative, demo mode isolated)
  6. **Phase 2, Step 6**: Real Recommendation Activity Logging (`public.recommendation_log`)
  7. **Phase 2, Step 7**: Real AI Career Assistant Implementation (`AICareerAssistant.tsx`, `/api/ai/chat`, `ai-context.ts`)
  8. **Phase 2, Step 8**: Comprehensive End-to-End Testing & Production Audit (14 routes, all test suites passed)
  9. **Profile Persistence & RLS Resolution**: Elimination of PostgreSQL error 42P17 (infinite recursion in `profiles` RLS policy) via direct scalar checks (`auth.uid() = id`), atomic upsert flow in `AuthContext.tsx`, and provided idempotent migration `lib/supabase/fix_profiles_rls.sql`.
  10. **Official Logo & Brand Asset Integration**: Complete visual implementation of official 3D graduation cap 'E' mark and "EduSphere Ai" wordmark across `Navbar`, `Sidebar`, `DashboardShell`, auth pages (`/login`, `/signup`), landing page footer, `AICareerAssistant`, and browser/metadata icons (`favicon.ico`, `icon.png`, `apple-icon.png`).
  11. **50 Colleges, 205 Courses & 154 MHT CET Cutoffs Full Relational Integration**: Established normalized relational architecture across `public.colleges`, `public.college_courses`, and `public.college_cutoffs`. Generated idempotent migration `lib/supabase/import_mhtcet_cutoffs_dataset.sql`, created offline-first dataset `lib/data/edusphere-colleges-dataset.ts`, added course details & category cutoffs (OPEN, OBC, SC, ST) to `CollegeCard`, added Stream & NAAC filters to `/colleges`, and upgraded `computeCollegeGuidance` with real cutoff benchmarking.
- **Current Priority**:
  - Execute `lib/supabase/import_mhtcet_cutoffs_dataset.sql` in Supabase SQL Editor for production database parity.
  - Zero unresolved runtime defects in application code.
- **Next**:
  - Final review and verification.

---

## A. PROJECT OVERVIEW

- **Project Name**: EduSphere AI
- **Purpose**: A comprehensive, AI-powered education and career guidance platform tailored for Indian engineering and technology students. The platform bridges the gap between academic education, skill readiness, and industry employment by providing data-backed college admissions intelligence, curated internship tracks, placement readiness evaluation, personalized roadmaps, and an interactive AI Career Assistant.
- **Main Student Workflow**:
  1. **Authentication**: Student signs up or signs in via Supabase Authentication.
  2. **Profile Completion**: Student provides academic credentials on `/profile` (Full Name, Preferred Branch, Entrance Score, CGPA on a 10.0 scale, Preferred Study/Work Location, Career Goal, and Technical Skills).
  3. **Personalized Dashboard**: `/dashboard` displays live Profile Strength, calculated Career Readiness Score, Placement Eligibility counts, and quick-access recommendation summaries.
  4. **Opportunity Exploration**: Student browses real database catalogs for `/colleges` (cutoffs, placement records, fees), `/internships` (stipends, durations, required skills), and `/placements` (eligibility CGPA, package, skills).
  5. **AI Guidance & Intelligence**: `/recommendations` provides deterministic match scores, skill gap analysis, personalized milestone roadmaps, and actionable career steps.
  6. **AI Career Assistant**: Student engages with the embedded career assistant for grounded advice on skill acquisition, placement eligibility, and interview preparation.
  7. **Saved Items**: Student bookmarks opportunities to `/saved` with instantaneous cross-page synchronization.

---

## B. TECH STACK

- **Framework**: Next.js 16.3.5 (App Router architecture, Webpack bundler configured via `next dev --webpack` and `next build --webpack`)
- **UI Library**: React 19.2.8 & React DOM 19.2.8
- **Language**: TypeScript 5.x (Strict type checking enabled)
- **Styling**: Tailwind CSS v4 (@tailwindcss/postcss) with custom Stellar-inspired modern dark/light typography and glassmorphism elements
- **Database & Auth**: Supabase PostgreSQL 15+ with Row Level Security (RLS) enabled
- **Client Libraries**:
  - `@supabase/supabase-js` (^2.116.0)
  - `@supabase/ssr` (^0.12.7)
- **Deployment Status**: Production-ready, Netlify-compatible, zero client-side secret leaks, SSR and static route generation fully verified across all 14 routes.
- **Next.js API Routes**:
  - `/api/ai/chat` (POST: Authenticated AI Career Assistant endpoint with session validation, rate limiting, and grounded fallback engine)
- **AI Architecture**:
  - Deterministic evaluation engine: `lib/ai-guidance.ts`
  - Grounded context synthesis: `lib/ai-context.ts`
  - Interactive chat interface: `components/ai-guidance/AICareerAssistant.tsx`
  - Fallback intelligence: Rule-based structured career counselor trained on the user profile and live opportunity database

---

## C. APPLICATION STRUCTURE

The codebase is strictly organized by functional domain. The following key directories and files actually exist:

```
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat/
│   │           └── route.ts         # Authenticated AI Career Assistant API route
│   ├── colleges/
│   │   └── page.tsx                 # Real Supabase college catalog & search
│   ├── dashboard/
│   │   └── page.tsx                 # Student command center & readiness overview
│   ├── internships/
│   │   └── page.tsx                 # Real Supabase internship catalog & filters
│   ├── login/
│   │   └── page.tsx                 # Supabase authentication login page
│   ├── placements/
│   │   └── page.tsx                 # Real Supabase campus placement catalog
│   ├── profile/
│   │   └── page.tsx                 # Student profile & academic details editor
│   ├── recommendations/
│   │   └── page.tsx                 # AI Guidance, Career Intelligence & Roadmap
│   ├── saved/
│   │   └── page.tsx                 # Saved colleges, internships, placements
│   ├── signup/
│   │   └── page.tsx                 # New student account registration
│   ├── layout.tsx                   # Root layout with AuthProvider & Navigation
│   └── page.tsx                     # Public landing page with CTA workflows
├── components/
│   ├── ai-guidance/
│   │   ├── ActionPlanSection.tsx    # Concrete next steps generated by AI
│   │   ├── AICareerAssistant.tsx    # Interactive AI Career Counselor modal/chat
│   │   ├── CareerRoadmapView.tsx    # Interactive career progression roadmap
│   │   └── GuidanceOverview.tsx     # High-level career readiness summary
│   ├── CollegeCard.tsx              # Card UI for college opportunity
│   ├── DashboardCard.tsx            # Metric cards on student dashboard
│   ├── icons.tsx                    # Shared SVG icon primitives
│   ├── InternshipCard.tsx           # Card UI for internship opportunity
│   ├── Logo.tsx                     # Official EduSphere AI responsive brand component
│   ├── Navbar.tsx                   # Main application header & user menu
│   ├── PlacementCard.tsx            # Card UI for placement drive
│   ├── ProfileForm.tsx              # Profile editor with multi-attribute remount key
│   ├── ProtectedRoute.tsx           # Auth gate redirecting unauthenticated users
│   ├── RecommendationCard.tsx       # AI recommendation display card
│   └── Sidebar.tsx                  # Authenticated student navigation sidebar
├── context/
│   └── AuthContext.tsx              # Single source of truth for auth & student state
├── lib/
│   ├── data/
│   │   └── pune-colleges-dataset.ts # Typed 30 Pune engineering colleges opportunity dataset
│   ├── supabase/
│   │   ├── client.ts                # Browser singleton Supabase client
│   │   ├── db-helpers.ts            # UUID converters and skill normalizers
│   │   ├── fix_profiles_rls.sql     # Idempotent RLS repair script for error 42P17
│   │   ├── import_pune_colleges.sql # Idempotent 30 Pune colleges migration & program normalization
│   │   ├── opportunities.ts         # Authoritative Supabase catalog queries
│   │   └── seed_opportunities.sql   # Seed dataset for colleges, internships, placements
│   ├── ai-context.ts                # Grounded prompt context builder for AI assistant
│   ├── ai-guidance.ts               # Deterministic AI recommendation scoring engine
│   ├── demo-data.ts                 # Curated fallback data strictly for demo mode
│   └── profile-utils.ts             # Profile strength and completeness algorithms
├── types/
│   └── index.ts                     # TypeScript definitions for entities & profiles
├── next.config.ts                   # Next.js configuration & auth route rewrites
└── package.json                     # Dependency definitions and scripts
```

---

## D. DATABASE ARCHITECTURE

The authoritative database is hosted on Supabase PostgreSQL. Tables and relationships are as follows:

```
auth.users (Supabase managed auth table)
    │
    │ (1-to-1: auth.users.id = profiles.id)
    ▼
public.profiles
    - id (UUID, PK, FK -> auth.users.id ON DELETE CASCADE)
    - full_name (text)
    - role (text, default 'student')
    - created_at (timestamptz)
    - updated_at (timestamptz)
    │
    │ (1-to-1: profiles.id = student_profiles.profile_id)
    ▼
public.student_profiles
    - id (UUID, PK)
    - profile_id (UUID, FK -> public.profiles.id ON DELETE CASCADE)
    - preferred_branch (text, nullable)
    - entrance_score (numeric, nullable)
    - cgpa (numeric, nullable, range [0.00, 10.00])
    - preferred_location (text, nullable)
    - career_goal (text, nullable)
    - created_at (timestamptz)
    - updated_at (timestamptz)
    │
    ├── (1-to-Many) ──► public.student_skills
    │                       - id (UUID, PK)
    │                       - student_profile_id (UUID, FK -> student_profiles.id)
    │                       - skill_name (text, NOT NULL)
    │                       - proficiency_level (text, NOT NULL, default 'intermediate')
    │
    ├── (1-to-Many) ──► public.saved_items
    │                       - id (UUID, PK)
    │                       - student_profile_id (UUID, FK -> student_profiles.id)
    │                       - item_type (text, CHECK in 'college', 'internship', 'placement')
    │                       - item_id (UUID, deterministic or raw opportunity ID)
    │                       - saved_at (timestamptz)
    │
    └── (1-to-Many) ──► public.recommendation_log
                            - id (UUID, PK)
                            - student_profile_id (UUID, FK -> student_profiles.id)
                            - item_type (text)
                            - item_id (UUID)
                            - match_score (numeric)
                            - created_at (timestamptz)

Opportunity Catalog Tables (Public read, RLS protected against client mutation):
- public.colleges (30 Pune Engineering Colleges + curated national universities)
    - id (UUID, PK), name, location, state, course, fees, avg_package (INR), highest_package (INR), placement_rate, college_type (CHECK in 'government', 'private', 'autonomous'), entrance_exam, data_source ('EduSphere imported dataset')
- public.college_programs (Normalized branch/program relation, UNIQUE on college_id, program_name)
    - id (UUID, PK), college_id (UUID, FK -> colleges.id ON DELETE CASCADE), program_name (text), created_at (timestamptz)
- public.internships (9 rows)
    - id (UUID, PK), company, role, location, remote (boolean), stipend (numeric, CHECK >= 0), duration
- public.internship_skills (35 rows)
    - id (UUID, PK), internship_id (UUID, FK -> internships.id), skill_name (text)
- public.placements (9 rows)
    - id (UUID, PK), company, role, industry, min_cgpa (numeric, CHECK BETWEEN 0.0 AND 10.0), location
- public.placement_skills (31 rows)
    - id (UUID, PK), placement_id (UUID, FK -> placements.id), skill_name (text)
```

---

## E. AUTHENTICATION

- **Engine**: Supabase Authentication via `@supabase/ssr` browser singleton (`createClient()`).
- **Signup**: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
- **Login**: `supabase.auth.signInWithPassword({ email, password })`.
  - In `app/login/page.tsx`, `handleLogin` invokes `await refreshProfile(data.session.user)` before navigating to ensure memory is populated.
- **Logout**: `supabase.auth.signOut()`. Clears in-memory states and redirects to `/login`.
- **Session Lifecycle (`context/AuthContext.tsx`)**:
  - `onAuthStateChange` listener listens to events:
    - `INITIAL_SESSION`: initial page hydration.
    - `SIGNED_IN`: initiates `loadUserProfile()`.
    - `SIGNED_OUT`: resets all user state to `null`.
    - `TOKEN_REFRESHED`: updates active JWT session.
    - `USER_UPDATED`: synchronizes user metadata.
- **Concurrency Guard**: `inFlightLoadRef` prevents concurrent overlapping profile queries.

---

## F. STUDENT PROFILE

Persistent Profile Fields and their authoritative storage destinations:

| Field | Supabase Destination | Format / Constraints |
|---|---|---|
| `full_name` | `public.profiles.full_name` & `auth.users.user_metadata` | text |
| `preferred_branch` | `public.student_profiles.preferred_branch` | text |
| `entrance_score` | `public.student_profiles.entrance_score` | numeric (e.g. 95) |
| `cgpa` | `public.student_profiles.cgpa` | numeric (0.00 – 10.00, 2 decimals) |
| `preferred_location` | `public.student_profiles.preferred_location` | text (e.g. "Maharashtra") |
| `career_goal` | `public.student_profiles.career_goal` | text (e.g. "Full Stack Developer") |
| `skills` | `public.student_skills.skill_name` | Array of text, case-insensitive deduplicated, `proficiency_level = 'intermediate'` |

---

## G. OPPORTUNITY DATA

Authoritative live database catalog counts:
- **Colleges**: 11
- **Internships**: 9
- **Placements**: 9
- **Internship Skills**: 35
- **Placement Skills**: 31
- **Total Opportunity Entities**: 29
- **Total Associated Opportunity Skills**: 66

All discovery pages (`/colleges`, `/internships`, `/placements`) and guidance engines read directly from these tables via `lib/supabase/opportunities.ts`.

---

## H. SAVED ITEMS

- **Authoritative Source**: `public.saved_items`.
- **Structure**: `id` (UUID PK), `student_profile_id` (UUID FK), `item_type` ('college' | 'internship' | 'placement'), `item_id` (UUID), `saved_at` (timestamptz).
- **Duplicate Prevention**: `toggleSaveItem()` checks if item is already present in `savedItemIds` before inserting; deletes existing row when toggled off.
- **User Isolation**: Enforced by RLS (`sp.profile_id = auth.uid()`). Students cannot view or modify another student's saved items.
- **UUID Mapping**: `lib/supabase/db-helpers.ts` provides `itemIdToDbUuid()` and `dbUuidToItemId()` to safely map legacy demo string IDs (e.g. `col-1`) into deterministic UUID format (`00000000-0000-0000-0000-00636f6c2d31`) when needed.

---

## I. RECOMMENDATION ENGINE

- **Centralized Engine**: `lib/ai-guidance.ts`.
- **Deterministic Formulas**:
  - College Recommendation Match Score:
    $$\text{Score} = w_{\text{cutoff}} \cdot S_{\text{cutoff}} + w_{\text{branch}} \cdot S_{\text{branch}} + w_{\text{loc}} \cdot S_{\text{loc}}$$
  - Internship Recommendation Match Score:
    $$\text{Score} = w_{\text{skill}} \cdot \left(\frac{|\text{StudentSkills} \cap \text{RequiredSkills}|}{|\text{RequiredSkills}|}\right) + w_{\text{pref}} \cdot S_{\text{pref}}$$
  - Placement Recommendation Match Score:
    $$\text{Eligibility Gate}: \text{Student CGPA} \ge \text{Placement } \text{min\_cgpa}$$
    $$\text{Score} = \text{EligibilityGate} \times \left(0.5 \cdot \frac{\text{CGPA}}{10} + 0.5 \cdot \frac{|\text{MatchedSkills}|}{|\text{RequiredSkills}|}\right)$$
- **RULE**: **Existing recommendation formulas must not be modified unless explicitly requested.**

---

## J. AI GUIDANCE

All calculations are centralized in `lib/ai-guidance.ts`:
- **College Guidance**: Categorizes colleges into Reach, Target, and Safe based on student entrance score vs historical cutoffs.
- **Internship Guidance**: Evaluates role alignment, stipend tier, and practical skill development opportunities.
- **Placement Guidance**: Verifies minimum CGPA eligibility gates and matches required technical competencies.
- **Skill Gap Analysis**: Compares student skills against target roles to identify missing high-demand skills.
- **Career Readiness Score**: Composite score (0–100%) synthesizing profile strength, CGPA, skill coverage, and placement eligibility. Used consistently across Dashboard, AI Guidance, and Career Intelligence.
- **Placement Readiness Score**: Percentage of campus placement drives for which the student currently satisfies both CGPA and skill requirements.
- **Career Roadmap**: Staged milestones (Immediate, Short-term, Long-term) aligned with the student's declared `career_goal`.
- **Action Plan**: Prioritized checklist of concrete tasks to enhance student readiness.

---

## K. AI CAREER ASSISTANT

- **Frontend**: `components/ai-guidance/AICareerAssistant.tsx`.
- **API Endpoint**: `app/api/ai/chat/route.ts` (POST).
- **Prompt Grounding**: `lib/ai-context.ts` constructs rich, grounded system prompts injecting current student profile, CGPA, top matching colleges, internships, placements, and identified skill gaps.
- **Authentication**: Bearer token passed in `Authorization: Bearer <access_token>`. Verified server-side via `supabase.auth.getUser(token)`.
- **Rate Limiting**: Sliding-window rate limiter enforcing a maximum of 25 requests/minute per authenticated user/IP.
- **Provider Architecture**: Supports upstream LLM providers when `AI_PROVIDER_API_KEY` is configured in environment.
- **Grounded Fallback Engine**: If no external provider key is configured, an intelligent built-in career guidance engine analyzes the prompt and provides detailed, actionable advice grounded in the student's actual Supabase profile and opportunity records.
- **Secret Protection**: Upstream API keys are strictly read in `route.ts` on the server. Zero provider secrets are shipped to browser bundles.

---

## L. SECURITY

- **Row Level Security (RLS)**: Active and enforced on all 10 tables.
- **Profiles Ownership**: Direct scalar comparison `auth.uid() = id` (no subqueries).
- **Student Profiles Ownership**: Direct scalar comparison `auth.uid() = profile_id`.
- **Student Skills / Saved Items / Recommendation Log**: Parent check via `student_profile_id` verifying `profile_id = auth.uid()`.
- **Opportunity Tables**: Public read (`SELECT USING (true)`), client mutations prohibited.
- **Multi-User Isolation**: User A cannot read, update, or delete User B's profile, student profile, skills, or saved items.
- **Key Security**: Zero `service_role` keys exist in repository code. The client only uses the public anon publishable key.

---

## M. DEMO MODE

- **Allowed Scope**: Strictly restricted to explicit unauthenticated visitors using the "Explore as Demo Student" button on `/login` or unauthenticated landing previews.
- **Identifier**: Demo user IDs strictly start with `demo-` (e.g. `demo-student-001`).
- **Isolation**: Handled by `loginDemo` in `AuthContext.tsx`. Demo state is persisted strictly in `localStorage` under `edusphere_demo_*` keys and never written to Supabase tables.
- **RULE**: **Authenticated users must not silently fall back to demo data.** If an authenticated student logs in, Supabase is the sole authoritative source of truth.

---

## N. DEPLOYMENT

- **Local Development**:
  ```bash
  npm run dev
  # Runs: next dev --webpack (Port 3000)
  ```
- **Production Build**:
  ```bash
  npm run build
  # Runs: next build --webpack
  ```
- **Linting**:
  ```bash
  npm run lint
  # Runs: eslint
  ```
- **Required Environment Variable Names** (stored in `.env.local` locally and platform secrets in production):
  - `NEXT_PUBLIC_SUPABASE_URL` (Supabase project URL)
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase public anon/publishable key)
  - `AI_PROVIDER_API_KEY` (Optional server-only key for external LLM provider)

*(Never commit or paste secret values into markdown documentation or source code).*
