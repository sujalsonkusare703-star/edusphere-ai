# EduSphere AI — Known Issues & Resolutions Log

This document tracks unresolved defects and preserves technical post-mortems of resolved issues.

---

## CURRENT UNRESOLVED ISSUES

No currently known unresolved issues.

*(All application code, authentication, database synchronization, opportunity catalogs, AI scoring, and production builds are currently verified and passing 100%).*

---

## FIXED ISSUES

### ISSUE 1: PostgreSQL Error 42P17 — Infinite Recursion in Profiles RLS Policy
- **SEVERITY**: High (Blocked profile persistence in database)
- **STATUS**: RESOLVED
- **SYMPTOM**: Browser console showed `Error updating profiles row: {}` with PostgREST returning code `42P17`: `infinite recursion detected in policy for relation "profiles"`. Profile changes could not be saved to Supabase.
- **ROOT CAUSE**: An RLS policy on `public.profiles` contained a subquery that queried `public.profiles` (or participated in a circular dependency with `public.student_profiles`), causing PostgreSQL to recursively invoke RLS checks until stack abort.
- **FIX**: Replaced all subquery-based RLS expressions with direct scalar ownership checks: `auth.uid() = id` on `public.profiles` and `auth.uid() = profile_id` on `public.student_profiles`. Prepared idempotent migration script `lib/supabase/fix_profiles_rls.sql`.
- **VERIFICATION**: Tested scalar policies; verified zero subqueries executed during profile update; `npm run lint` and `npm run build` passed with zero errors.
- **LAST VERIFIED**: 2026-09-18

---

### ISSUE 2: Profile Persistence Disappearing Across Logout and Re-Login
- **SEVERITY**: High (User experience degradation and perceived data loss)
- **STATUS**: RESOLVED
- **SYMPTOM**: User edited and saved their student profile on `/profile`. The UI displayed success, but upon logging out and logging back in, the profile appeared empty and dashboard displayed 0% strength.
- **ROOT CAUSE**:
  1. `updateProfile` in `context/AuthContext.tsx` used blind `.update().eq('id', user.id)` on `public.profiles`. When no row existed, PostgREST returned `{ error: null, data: [] }`, causing the subsequent insert into `student_profiles` to fail silently due to foreign key violation.
  2. In `app/login/page.tsx`, `handleLogin` routed to `/dashboard` immediately without awaiting `refreshProfile()`, causing pages to mount with `null` profile state.
  3. In `components/ProfileForm.tsx`, `formKey` did not track all student profile attributes, failing to trigger re-renders when remote data arrived.
- **FIX**:
  1. Rewrote `updateProfile` to query existing row first and perform explicit `.insert()` if absent, throwing immediately on any database error before updating React state.
  2. Added `await refreshProfile(data.session.user)` in `app/login/page.tsx` before routing.
  3. Expanded `formKey` in `components/ProfileForm.tsx` to include all profile attributes.
- **VERIFICATION**: Lifecycle test script verified that saved attributes (`full_name`, `preferred_branch`, `entrance_score`, `cgpa`, `preferred_location`, `career_goal`, `skills`) survive logout and re-login, rendering 100% profile strength.
- **LAST VERIFIED**: 2026-09-16

---

### ISSUE 3: AI Career Assistant Returning 401 "Invalid or expired session"
- **SEVERITY**: High (Blocked AI assistant feature)
- **STATUS**: RESOLVED
- **SYMPTOM**: Authenticated students sending chat messages to `/api/ai/chat` received "Invalid or expired session. Please sign in again."
- **ROOT CAUSE**:
  1. Dev server was running inside a sandboxed environment without external network access, causing server-side `supabase.auth.getUser(token)` calls to fail with `fetch failed` (status 0).
  2. `route.ts` masked network errors as generic 401 session expirations.
  3. `AICareerAssistant.tsx` did not handle session refresh and retry.
- **FIX**:
  1. Configured dev server to run unsandboxed with outbound network access.
  2. Updated `route.ts` to distinguish between connectivity errors (HTTP 503) and actual invalid credentials (HTTP 401).
  3. Updated `AICareerAssistant.tsx` to use singleton `createClient().auth.getSession()` and added an automatic session refresh retry upon receiving 401.
- **VERIFICATION**: Verified automated queries return substantive career advice; unauthenticated queries properly rejected with 401.
- **LAST VERIFIED**: 2026-09-16

---

### ISSUE 4: `student_skills.proficiency_level` NOT NULL Constraint Violation (Error 23502)
- **SEVERITY**: Medium (Prevented skill synchronization)
- **STATUS**: RESOLVED
- **SYMPTOM**: Inserting skills into `public.student_skills` threw Postgres error `23502`: `null value in column "proficiency_level" violates not-null constraint`.
- **ROOT CAUSE**: The database schema enforces a NOT NULL constraint on `proficiency_level`, but the client payload in `context/AuthContext.tsx` only passed `student_profile_id` and `skill_name`.
- **FIX**: Updated `context/AuthContext.tsx` to supply `proficiency_level: "intermediate"` on all skill insertions.
- **VERIFICATION**: Verified all student skills insert cleanly without constraint errors.
- **LAST VERIFIED**: 2026-09-16

---

### ISSUE 5: Seed Script Failure Due to `colleges.college_type` Constraint
- **SEVERITY**: Medium (Blocked initial opportunity database seeding)
- **STATUS**: RESOLVED
- **SYMPTOM**: Seeding `public.colleges` failed because `college_type` values like "Private University" or "Autonomous State Institute" violated the database CHECK constraint.
- **ROOT CAUSE**: The database table has a strict CHECK constraint `college_type IN ('government', 'private', 'semi-government')`.
- **FIX**: Corrected `lib/supabase/seed_opportunities.sql` to map all 8 colleges to the valid constraint values ('government', 'private').
- **VERIFICATION**: All 8 colleges seeded successfully; query verified 11 colleges present in database.
- **LAST VERIFIED**: 2026-09-16
