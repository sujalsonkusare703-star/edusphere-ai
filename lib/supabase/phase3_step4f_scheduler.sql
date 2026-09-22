-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 STEP 4F: AUTOMATIC COLLEGE MONITORING & SCHEDULER
-- 1. Adds scheduling and health columns to public.college_source_registry.
-- 2. Sets intelligent default check intervals based on source_type.
-- 3. Hardens RLS on public.college_data_change_events (Admin-only SELECT).
-- Idempotent, non-destructive, safe to rerun.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SCHEDULING & HEALTH COLUMNS ON public.college_source_registry
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- enabled (mirrors / defaults to is_active)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_source_registry' 
          AND column_name = 'enabled'
    ) THEN
        ALTER TABLE public.college_source_registry ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;
        UPDATE public.college_source_registry SET enabled = is_active;
    END IF;

    -- check_interval_minutes (defaults to 1440 min = 24 hours)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_source_registry' 
          AND column_name = 'check_interval_minutes'
    ) THEN
        ALTER TABLE public.college_source_registry ADD COLUMN check_interval_minutes INTEGER NOT NULL DEFAULT 1440;
    END IF;

    -- next_check_at (defaults to now())
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_source_registry' 
          AND column_name = 'next_check_at'
    ) THEN
        ALTER TABLE public.college_source_registry ADD COLUMN next_check_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;

    -- last_successful_check_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_source_registry' 
          AND column_name = 'last_successful_check_at'
    ) THEN
        ALTER TABLE public.college_source_registry ADD COLUMN last_successful_check_at TIMESTAMPTZ;
    END IF;

    -- last_error
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_source_registry' 
          AND column_name = 'last_error'
    ) THEN
        ALTER TABLE public.college_source_registry ADD COLUMN last_error TEXT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. INTELLIGENT SOURCE TYPE INTERVAL DEFAULTS
-- ------------------------------------------------------------------------------
UPDATE public.college_source_registry
SET check_interval_minutes = CASE
    WHEN source_type IN ('EXAM_AUTHORITY', 'ADMISSION_PAGE') THEN 360  -- 6 hours
    WHEN source_type = 'NOTIFICATION_CIRCULAR' THEN 720              -- 12 hours
    WHEN source_type = 'OFFICIAL_PORTAL' THEN 1440                   -- 24 hours
    WHEN source_type = 'FEE_STRUCTURE' THEN 10080                    -- 7 days
    ELSE 1440
END
WHERE check_interval_minutes = 1440;

-- Performance index for scheduler querying
CREATE INDEX IF NOT EXISTS idx_source_registry_scheduler 
ON public.college_source_registry(enabled, next_check_at) 
WHERE enabled = true;

-- ------------------------------------------------------------------------------
-- 3. RLS HARDENING: public.college_data_change_events
-- Revoke public read access. Allow SELECT ONLY for administrators.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Drop legacy permissive policy
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_data_change_events' 
          AND policyname = 'Allow public read access to college_data_change_events'
    ) THEN
        DROP POLICY "Allow public read access to college_data_change_events" ON public.college_data_change_events;
    END IF;

    -- Create Admin-only SELECT policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_data_change_events' 
          AND policyname = 'Admins can read college_data_change_events'
    ) THEN
        CREATE POLICY "Admins can read college_data_change_events" 
        ON public.college_data_change_events FOR SELECT 
        USING (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        );
    END IF;
END $$;

COMMIT;
