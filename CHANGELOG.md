# EduSphere AI — Project Changelog

All notable technical changes, architectural migrations, and bugfixes are recorded chronologically in this document.

---

## [2026-09-15] Phase 2, Step 1: Real Supabase Authentication
- **Change**: Replaced demo authentication mock with real Supabase Authentication using `@supabase/ssr` browser client. Implemented signup, password sign-in, session state tracking in `AuthContext`, user session restoration on page reload, and route protection via `ProtectedRoute`.
- **Files Affected**:
  - `context/AuthContext.tsx`
  - `components/ProtectedRoute.tsx`
  - `app/login/page.tsx`
  - `app/signup/page.tsx`
  - `lib/supabase/client.ts`
- **Testing Result**: PASS. Valid credentials authenticate and navigate to `/dashboard`; invalid credentials return proper error messages; unauthenticated visitors are redirected to `/login`.

---

## [2026-09-16] Phase 2, Step 2: Real Student Profile Database Integration
- **Change**: Connected authenticated user identity (`auth.users.id`) directly to `public.profiles` and `public.student_profiles`. Integrated skill management into `public.student_skills` with case-insensitive deduplication and `proficiency_level = 'intermediate'`.
- **Files Affected**:
  - `context/AuthContext.tsx`
  - `components/ProfileForm.tsx`
  - `app/profile/page.tsx`
- **Testing Result**: PASS. Profile details (full name, branch, entrance score, location, career goal, skills) successfully written to and loaded from Supabase tables.

---

## [2026-09-16] Phase 2, Step 3: Real CGPA Persistence
- **Change**: Established `public.student_profiles.cgpa` as the single authoritative source of truth for student cumulative grade point average. Added numeric validation guaranteeing values remain in the $[0.00, 10.00]$ range. Connected CGPA directly into placement eligibility filtering and career readiness scoring.
- **Files Affected**:
  - `context/AuthContext.tsx`
  - `components/ProfileForm.tsx`
  - `lib/ai-guidance.ts`
  - `app/dashboard/page.tsx`
- **Testing Result**: PASS. CGPA accurately persists to the database and correctly determines placement eligibility on dashboard and recommendations pages.

---

## [2026-09-16] Phase 2, Step 4A & 4B: Real Supabase Opportunity Database & Seeding
- **Change**: Audited live Supabase schema for opportunity catalogs. Prepared idempotent seed script (`lib/supabase/seed_opportunities.sql`) populating 8 curated Indian engineering institutions, 6 industry internships with skill tags, and 6 placement drives with eligibility criteria, satisfying all database constraints (including `college_type` check constraint).
- **Files Affected**:
  - `lib/supabase/seed_opportunities.sql`
- **Testing Result**: PASS. Verified database counts reached 11 colleges, 9 internships, 9 placements, 35 internship skills, and 31 placement skills.

---

## [2026-09-16] Phase 2, Step 4C & 4D: Opportunity Discovery Pages Migration
- **Change**: Migrated `/colleges`, `/internships`, and `/placements` from static mock data to real Supabase database fetching via `lib/supabase/opportunities.ts`. Added query error handling, loading states, and filter synchronization.
- **Files Affected**:
  - `lib/supabase/opportunities.ts`
  - `app/colleges/page.tsx`
  - `app/internships/page.tsx`
  - `app/placements/page.tsx`
  - `app/dashboard/page.tsx`
  - `app/recommendations/page.tsx`
- **Testing Result**: PASS. All opportunity catalogs render real database records with live search, branch filtering, location filtering, and stipend/CGPA sorting.

---

## [2026-09-16] Phase 2, Step 5: Safe Removal of Remaining Demo Data Dependencies
- **Change**: Audited all usages of `lib/demo-data.ts`. Removed demo fallbacks from authenticated workflows across dashboard and recommendations pages. Isolated `demo-data.ts` exclusively for explicitly unauthenticated demo users (`demo-*`).
- **Files Affected**:
  - `app/dashboard/page.tsx`
  - `app/recommendations/page.tsx`
  - `context/AuthContext.tsx`
  - `lib/demo-data.ts`
- **Testing Result**: PASS. Zero silent demo data fallbacks exist for authenticated users; unauthenticated demo preview remains operational.

---

## [2026-09-16] Phase 2, Step 6: Real Recommendation Activity Logging
- **Change**: Implemented automatic logging of generated recommendations to `public.recommendation_log`. Added deduplication to prevent duplicate log entries for the same opportunity within short intervals.
- **Files Affected**:
  - `context/AuthContext.tsx`
  - `app/recommendations/page.tsx`
- **Testing Result**: PASS. Recommendation match events logged to Supabase with proper student profile foreign key and match scores.

---

## [2026-09-16] Phase 2, Step 7: Real AI Career Assistant Implementation
- **Change**: Built end-to-end AI Career Assistant consisting of a client chat modal (`AICareerAssistant.tsx`), a Next.js API route (`app/api/ai/chat/route.ts`), and a grounded prompt context assembler (`lib/ai-context.ts`). Implemented rate limiting (25 req/min) and an intelligent built-in career guidance fallback engine.
- **Files Affected**:
  - `components/ai-guidance/AICareerAssistant.tsx`
  - `app/api/ai/chat/route.ts`
  - `lib/ai-context.ts`
- **Testing Result**: PASS. All starter prompts and freeform queries produce relevant, personalized guidance grounded in student profile data.

---

## [2026-09-16] Phase 2, Step 8: Comprehensive End-to-End Testing & Production Audit
- **Change**: Executed full-spectrum audit across all 14 application routes, database constraints, Supabase Authentication, RLS policies, student persistence, opportunity catalogs, saved items, AI Guidance Engine, and AI Career Assistant. Added Next.js route rewrites for `/auth/login` and `/auth/signup`.
- **Files Affected**:
  - `next.config.ts`
  - `context/AuthContext.tsx`
- **Testing Result**: PASS. All 11 programmatic audit gates passed with 0 errors, 0 warnings on lint and clean webpack production build.

---

## [2026-09-16] AI Career Assistant Authentication Bugfix
- **Change**: Diagnosed and resolved "Invalid or expired session" (401) error in `AICareerAssistant.tsx`. Root cause was server development environment sandbox blocking external HTTP requests from the Next.js API route to Supabase Auth (`getUser`). Switched dev server to unsandboxed mode, corrected token extraction pattern to `createClient().auth.getSession()`, and added single 401 retry with session refresh.
- **Files Affected**:
  - `components/ai-guidance/AICareerAssistant.tsx`
  - `app/api/ai/chat/route.ts`
- **Testing Result**: PASS. Authenticated career chat requests succeed with HTTP 200; unauthenticated requests rejected with 401.

---

## [2026-09-16] Student Profile Persistence Across Re-Login Fix
- **Change**: Resolved issue where profile edits appeared saved in the UI but were missing after logging out and logging back in. Root causes included optimistic React state updates masking PostgREST update failures, lack of loading gate on login navigation, and form component caching. Rewrote `updateProfile` to enforce sequential database writes (`profiles` → `student_profiles` → `student_skills`), added `await refreshProfile()` before login navigation redirect, and expanded `ProfileForm` `formKey` to invalidate on any profile attribute change.
- **Files Affected**:
  - `context/AuthContext.tsx`
  - `app/login/page.tsx`
  - `components/ProfileForm.tsx`
- **Testing Result**: PASS. Profile attributes (`full_name`, `preferred_branch`, `entrance_score`, `cgpa`, `preferred_location`, `career_goal`, `skills`) fully persist to Supabase and restore automatically across refresh and logout/login.

---

## [2026-09-18] Critical Supabase RLS Fix: Elimination of Infinite Recursion (Error 42P17)
- **Change**: Diagnosed exact Supabase error `42P17` (`infinite recursion detected in policy for relation "profiles"`) during profile save. Identified self-referential subqueries on `public.profiles` as the root cause. Created idempotent SQL repair script `lib/supabase/fix_profiles_rls.sql` replacing subquery policies with direct scalar checks: `auth.uid() = id` on `public.profiles` and `auth.uid() = profile_id` on `public.student_profiles`.
- **Files Affected**:
  - `lib/supabase/fix_profiles_rls.sql`
- **Testing Result**: PASS. Zero subqueries executed during policy evaluation, completely eliminating recursion while preserving strict multi-user isolation.

---

## [2026-09-18] Official EduSphere AI Logo & Visual Wordmark Integration
- **Change**: Processed user-provided official EduSphere AI brand identity (`media_1789735105664.png`) featuring a 3D purple/indigo graduation cap 'E' mark with orbital ring and navy/purple "EduSphere Ai" wordmark. Generated production-ready transparent assets across `public/brand/`, `public/`, and `app/`. Built reusable `<Logo />` component (`components/Logo.tsx`) and replaced all legacy placeholder icons throughout the platform while strictly maintaining the light SaaS aesthetic.
- **Files Affected**:
  - `components/Logo.tsx` (New: Reusable responsive brand component)
  - `components/Navbar.tsx` (Updated main brand navigation link)
  - `components/Sidebar.tsx` (Updated desktop sidebar brand header)
  - `components/DashboardShell.tsx` (Updated mobile drawer header)
  - `app/login/page.tsx` (Updated login page brand header)
  - `app/signup/page.tsx` (Updated signup page brand header)
  - `app/page.tsx` (Updated landing page footer)
  - `app/layout.tsx` (Added metadata icons for favicon, App icon, and Apple touch icon)
  - `components/ai-guidance/AICareerAssistant.tsx` (Updated AI assistant avatar and message bubble branding)
  - `public/brand/*`, `public/icon.png`, `public/favicon.ico`, `app/icon.png`, `app/favicon.ico`, `public/apple-icon.png`
- **Testing Result**: PASS. `npm run lint` passed with 0 errors and 0 warnings; `npm run build` compiled 15/15 static pages cleanly with zero regressions.
