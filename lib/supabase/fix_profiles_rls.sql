-- ==============================================================================
-- EDUSPHERE AI — CRITICAL SUPABASE RLS FIX: ELIMINATE INFINITE RECURSION
-- File: lib/supabase/fix_profiles_rls.sql
-- Description:
--   Resolves error 42P17 ("infinite recursion detected in policy for relation 'profiles'")
--   by replacing subquery-based / self-referencing policies with direct scalar
--   ownership checks: id = auth.uid() on public.profiles and
--   profile_id = auth.uid() on public.student_profiles.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SAFELY CLEAN UP EXISTING POLICIES ON public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all existing policies on public.profiles dynamically
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CREATE MINIMAL, SECURE, NON-RECURSIVE POLICIES FOR public.profiles
--    Relationship: auth.users.id = public.profiles.id
--    Direct scalar check: auth.uid() = id (ZERO subqueries, ZERO recursion)
-- ------------------------------------------------------------------------------

-- SELECT: Authenticated users can view only their own profile row
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- INSERT: Authenticated users can create only their own profile row
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Authenticated users can update only their own profile row
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- DELETE: Authenticated users can delete only their own profile row
CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);


-- ------------------------------------------------------------------------------
-- 3. SAFELY CLEAN UP AND HARDEN public.student_profiles
--    Relationship: public.student_profiles.profile_id = auth.users.id
--    Direct scalar check: auth.uid() = profile_id
--    (DOES NOT query profiles, eliminating cross-table circular dependencies)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'student_profiles'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_profiles', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Authenticated users can view only their own student profile
CREATE POLICY "student_profiles_select_own"
ON public.student_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

-- INSERT: Authenticated users can insert only their own student profile
CREATE POLICY "student_profiles_insert_own"
ON public.student_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

-- UPDATE: Authenticated users can update only their own student profile
CREATE POLICY "student_profiles_update_own"
ON public.student_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- DELETE: Authenticated users can delete only their own student profile
CREATE POLICY "student_profiles_delete_own"
ON public.student_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = profile_id);


-- ------------------------------------------------------------------------------
-- 4. SAFELY CLEAN UP AND HARDEN public.student_skills
--    Relationship: student_skills.student_profile_id -> student_profiles.id
--    Parent check uses student_profiles (profile_id = auth.uid())
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'student_skills'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_skills', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "student_skills_select_own"
ON public.student_skills
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = student_skills.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "student_skills_insert_own"
ON public.student_skills
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = student_skills.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "student_skills_update_own"
ON public.student_skills
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = student_skills.student_profile_id
          AND sp.profile_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = student_skills.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "student_skills_delete_own"
ON public.student_skills
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = student_skills.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);


-- ------------------------------------------------------------------------------
-- 5. SAFELY CLEAN UP AND HARDEN public.saved_items
--    Relationship: saved_items.student_profile_id -> student_profiles.id
-- ------------------------------------------------------------------------------
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'saved_items'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_items', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "saved_items_select_own"
ON public.saved_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = saved_items.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "saved_items_insert_own"
ON public.saved_items
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = saved_items.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "saved_items_delete_own"
ON public.saved_items
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = saved_items.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);


-- ------------------------------------------------------------------------------
-- 6. SAFELY CLEAN UP AND HARDEN public.recommendation_log
--    Relationship: recommendation_log.student_profile_id -> student_profiles.id
-- ------------------------------------------------------------------------------
ALTER TABLE public.recommendation_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'recommendation_log'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.recommendation_log', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "recommendation_log_select_own"
ON public.recommendation_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = recommendation_log.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);

CREATE POLICY "recommendation_log_insert_own"
ON public.recommendation_log
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_profiles sp
        WHERE sp.id = recommendation_log.student_profile_id
          AND sp.profile_id = auth.uid()
    )
);


-- ------------------------------------------------------------------------------
-- 7. VERIFICATION QUERY
--    Inspect the newly created policies to ensure zero recursive patterns
-- ------------------------------------------------------------------------------
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'student_profiles', 'student_skills', 'saved_items', 'recommendation_log')
ORDER BY tablename, cmd;
