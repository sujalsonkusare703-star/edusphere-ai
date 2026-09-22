-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 STEP 4C: CHANGE EVENT QUEUE + STAGING LAYER
-- 1. Creates public.college_data_change_events staging table.
-- 2. Sets up status machine and event_type check constraints.
-- 3. Enables RLS (read-only for clients, strictly no public insert/update/delete).
-- 4. Establishes performance indexes for queue filtering and deduplication.
-- Idempotent, non-destructive, safe to rerun.
-- ==============================================================================

BEGIN;

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

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_college_data_change_events_updated_at'
    ) THEN
        CREATE TRIGGER trg_college_data_change_events_updated_at
        BEFORE UPDATE ON public.college_data_change_events
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Indexes for efficient queue querying and deduplication
CREATE INDEX IF NOT EXISTS idx_change_events_source_id ON public.college_data_change_events(source_id);
CREATE INDEX IF NOT EXISTS idx_change_events_college_id ON public.college_data_change_events(college_id);
CREATE INDEX IF NOT EXISTS idx_change_events_status ON public.college_data_change_events(status);
CREATE INDEX IF NOT EXISTS idx_change_events_created_at ON public.college_data_change_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_events_pending ON public.college_data_change_events(created_at DESC) 
    WHERE status IN ('DETECTED', 'PARSED', 'PENDING_REVIEW');

-- Row Level Security
ALTER TABLE public.college_data_change_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_data_change_events' 
          AND policyname = 'Allow public read access to college_data_change_events'
    ) THEN
        CREATE POLICY "Allow public read access to college_data_change_events" 
        ON public.college_data_change_events FOR SELECT USING (true);
    END IF;
END $$;

COMMIT;
