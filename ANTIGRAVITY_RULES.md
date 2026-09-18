# Antigravity Rules for EduSphere AI

These mandatory operational rules govern all future Antigravity coding and debugging sessions in the EduSphere AI repository. Every session must review and strictly adhere to these guidelines before inspecting or modifying code.

---

## The 20 Fundamental Rules

1. **READ `PROJECT_CONTEXT.md` BEFORE MODIFYING CODE.**
   Understand the tech stack, authoritative Supabase tables, directory structure, and existing data flows before touching any source file.

2. **READ `KNOWN_ISSUES.md` BEFORE DEBUGGING.**
   Check if the problem was already investigated, documented, or resolved in a previous phase to avoid duplicated effort or reintroducing regressions.

3. **READ `TEST_STATUS.md` BEFORE RUNNING A NEW FULL AUDIT.**
   Do not spend time rediscovering test states that have already been systematically validated and documented as PASS.

4. **READ `CHANGELOG.md` TO UNDERSTAND PREVIOUS FIXES.**
   Review the history of architectural transitions (e.g. demo data removal, CGPA persistence, RLS repair) to understand why code was written in its current shape.

5. **DO NOT RE-AUDIT THE ENTIRE PROJECT UNLESS:**
   - The user's requested task explicitly and genuinely requires it.
   - The project architecture has changed significantly.
   - The existing documentation is inconsistent with current findings.
   - A previously verified fix appears broken by new changes.

6. **START BY IDENTIFYING THE SMALLEST RELEVANT FILES.**
   Isolate the exact component, hook, or API route responsible for the requested behavior before taking any action.

7. **DO NOT MODIFY UNRELATED FILES.**
   Keep changes strictly scoped to the problem at hand. Do not reformat or refactor files that are unrelated to the current task.

8. **DO NOT REPEAT ALREADY-COMPLETED WORK.**
   Trust previous phase deliverables (e.g. opportunity data seeding, route rewrites, rate limiters) unless explicitly instructed otherwise.

9. **DO NOT CHANGE WORKING DATABASE SCHEMA.**
   Do not alter column names, add redundant tables, modify foreign keys, or change CHECK constraints unless there is an approved database blocker.

10. **DO NOT CHANGE RECOMMENDATION FORMULAS UNLESS EXPLICITLY REQUESTED.**
    The deterministic scoring algorithms in `lib/ai-guidance.ts` are authoritative and carefully calibrated. Keep them intact.

11. **DO NOT REPLACE SUPABASE DATA WITH DEMO DATA FOR AUTHENTICATED USERS.**
    Authenticated students must always use real database tables (`profiles`, `student_profiles`, `student_skills`, `saved_items`). Demo data from `lib/demo-data.ts` is strictly for unauthenticated demo sessions.

12. **NEVER EXPOSE SECRETS.**
    Never log, print, commit, or embed private keys, access tokens, passwords, or service-role keys in code or documentation.

13. **NEVER USE SERVICE-ROLE KEYS IN BROWSER CODE.**
    All client-side queries must use the public publishable anon key via `@supabase/ssr` or `@supabase/supabase-js`. Privileged operations must remain server-side.

14. **PRESERVE ROW LEVEL SECURITY (RLS).**
    Always maintain RLS policies that enforce user isolation (`auth.uid() = id`, `auth.uid() = profile_id`). Never disable RLS or make private tables publicly writable to bypass an error.

15. **AFTER EVERY MEANINGFUL FIX:**
    - Update `CHANGELOG.md` with the date, description, files touched, and test result.
    - Update `KNOWN_ISSUES.md` (move fixed items to the "FIXED ISSUES" section).
    - Update `TEST_STATUS.md` with latest verification results.
    - Update `PROJECT_CONTEXT.md` if architecture or features changed.

16. **BEFORE DECLARING A BUG FIXED:**
    - Reproduce the issue or verify the exact failure mechanism.
    - Fix the true root cause (not just surface symptoms).
    - Test the affected feature thoroughly.
    - Run `npm run lint` and confirm 0 errors.
    - Run `npm run build` and confirm a clean build.

17. **NEVER CLAIM A TEST PASSED WITHOUT ACTUALLY RUNNING IT.**
    Always run the corresponding CLI verification command or test script and inspect actual stdout/stderr before reporting results.

18. **TRUST THE DOCUMENTED VERIFIED STATE UNLESS CONTRADICTED BY EVIDENCE.**
    If a subsystem is documented as PASS in `TEST_STATUS.md` and operates cleanly, do not guess that it is broken.

19. **DO NOT PERFORM BROAD REFACTORS FOR SMALL BUGS.**
    Avoid rewriting entire modules when a targeted, surgical fix resolves the problem cleanly.

20. **PREFER MINIMAL, TARGETED CHANGES.**
    Maintain system stability, readability, and existing architectural patterns by making the smallest correct edit necessary.

---

## Future Session Protocol

Whenever starting a new task in this repository:

1. **Read**:
   - `ANTIGRAVITY_RULES.md`
   - `PROJECT_CONTEXT.md`
   - `KNOWN_ISSUES.md`
   - `TEST_STATUS.md`
2. **Execute**:
   - Identify the minimal relevant file(s).
   - Verify whether the issue has already been addressed.
   - Implement the minimal targeted fix.
   - Validate with `npm run lint` and `npm run build`.
   - Update the documentation memory files.
   - Provide a clear, structured summary of changes.
