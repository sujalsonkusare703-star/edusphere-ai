-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 STEP 4E: AUDIT LOG & ATOMIC APPROVAL WORKFLOW
-- 1. Creates public.college_audit_log immutable audit trail.
-- 2. Sets up performance indexes.
-- 3. Enables RLS (admin read-only, strictly immutable history, no client writes).
-- 4. Establishes atomic PostgreSQL approval transaction procedure.
-- Idempotent, non-destructive, safe to rerun.
-- ==============================================================================

BEGIN;

-- 1. Create Immutable Audit Log Table
CREATE TABLE IF NOT EXISTS public.college_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.college_data_change_events(id) ON DELETE SET NULL,
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id INT REFERENCES public.college_courses(course_id) ON DELETE SET NULL,
    modified_by UUID, -- References auth.users(id)
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    change_type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_college_audit_log_college ON public.college_audit_log(college_id);
CREATE INDEX IF NOT EXISTS idx_college_audit_log_event ON public.college_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_college_audit_log_created_at ON public.college_audit_log(created_at DESC);

-- 2. Row Level Security: Immutable Audit Trail
ALTER TABLE public.college_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit trail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_audit_log' 
          AND policyname = 'Admins can read college_audit_log'
    ) THEN
        CREATE POLICY "Admins can read college_audit_log" 
        ON public.college_audit_log FOR SELECT 
        USING (
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        );
    END IF;
END $$;

-- Strictly NO INSERT, UPDATE, or DELETE policies for public/anon clients.
-- Writes are performed exclusively by server-side approval service role / SECURITY DEFINER procedures.

-- 3. Atomic Database Update Procedure
CREATE OR REPLACE FUNCTION public.apply_college_change_event(
    p_event_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_event RECORD;
    v_source RECORD;
    v_before JSONB;
    v_after JSONB;
    v_audit_id UUID;
    v_prop JSONB;
    v_cand JSONB;
    v_new_hash TEXT;
BEGIN
    -- 1. Lock and fetch event
    SELECT * INTO v_event
    FROM public.college_data_change_events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Change event not found: %', p_event_id;
    END IF;

    -- 2. Concurrency & State Check
    IF v_event.status = 'APPLIED' THEN
        RAISE EXCEPTION 'Event already applied: %', p_event_id;
    END IF;

    IF v_event.status NOT IN ('PENDING_REVIEW', 'APPROVED') THEN
        RAISE EXCEPTION 'Event must be in PENDING_REVIEW or APPROVED state, currently %', v_event.status;
    END IF;

    v_prop := v_event.proposed_value;
    v_cand := COALESCE(v_prop->'extracted_data', v_prop);

    -- 3. Route specific mutations based on event_type
    IF v_event.event_type = 'ACCEPTED_EXAMS_UPDATE' THEN
        -- Capture before state
        IF v_event.course_id IS NOT NULL THEN
            SELECT jsonb_build_object('course_id', course_id, 'accepted_exams', accepted_exams, 'admission_verification_status', admission_verification_status)
            INTO v_before
            FROM public.college_courses
            WHERE course_id = v_event.course_id;

            -- Apply update to exact program
            UPDATE public.college_courses
            SET accepted_exams = ARRAY(SELECT jsonb_array_elements_text(v_cand->'exams'->0->'accepted_exams')),
                admission_verification_status = 'VERIFIED',
                updated_at = now()
            WHERE course_id = v_event.course_id;

            SELECT jsonb_build_object('course_id', course_id, 'accepted_exams', accepted_exams, 'admission_verification_status', admission_verification_status)
            INTO v_after
            FROM public.college_courses
            WHERE course_id = v_event.course_id;
        ELSE
            SELECT jsonb_build_object('college_id', id, 'accepted_exams', accepted_exams, 'admission_verification_status', admission_verification_status)
            INTO v_before
            FROM public.colleges
            WHERE id = v_event.college_id;

            UPDATE public.colleges
            SET accepted_exams = ARRAY(SELECT jsonb_array_elements_text(v_cand->'exams'->0->'accepted_exams')),
                admission_verification_status = 'VERIFIED',
                updated_at = now()
            WHERE id = v_event.college_id;

            SELECT jsonb_build_object('college_id', id, 'accepted_exams', accepted_exams, 'admission_verification_status', admission_verification_status)
            INTO v_after
            FROM public.colleges
            WHERE id = v_event.college_id;
        END IF;

    ELSIF v_event.event_type = 'ADMISSION_ROUTE_UPDATE' THEN
        IF v_event.course_id IS NOT NULL THEN
            SELECT jsonb_build_object('course_id', course_id, 'admission_route', admission_route, 'admission_verification_status', admission_verification_status)
            INTO v_before
            FROM public.college_courses
            WHERE course_id = v_event.course_id;

            UPDATE public.college_courses
            SET admission_route = (v_cand->'routes'->0->>'admission_route'),
                admission_verification_status = 'VERIFIED',
                updated_at = now()
            WHERE course_id = v_event.course_id;

            SELECT jsonb_build_object('course_id', course_id, 'admission_route', admission_route, 'admission_verification_status', admission_verification_status)
            INTO v_after
            FROM public.college_courses
            WHERE course_id = v_event.course_id;
        ELSE
            SELECT jsonb_build_object('college_id', id, 'admission_route', admission_route, 'admission_verification_status', admission_verification_status)
            INTO v_before
            FROM public.colleges
            WHERE id = v_event.college_id;

            UPDATE public.colleges
            SET admission_route = (v_cand->'routes'->0->>'admission_route'),
                admission_verification_status = 'VERIFIED',
                updated_at = now()
            WHERE id = v_event.college_id;

            SELECT jsonb_build_object('college_id', id, 'admission_route', admission_route, 'admission_verification_status', admission_verification_status)
            INTO v_after
            FROM public.colleges
            WHERE id = v_event.college_id;
        END IF;

    ELSIF v_event.event_type = 'SOURCE_URL_REDIRECT' THEN
        SELECT jsonb_build_object('source_id', id, 'source_url', source_url)
        INTO v_before
        FROM public.college_source_registry
        WHERE id = v_event.source_id;

        UPDATE public.college_source_registry
        SET source_url = (v_prop->>'finalUrl'),
            updated_at = now()
        WHERE id = v_event.source_id;

        SELECT jsonb_build_object('source_id', id, 'source_url', source_url)
        INTO v_after
        FROM public.college_source_registry
        WHERE id = v_event.source_id;

    ELSE
        -- Default fallback snapshot
        v_before := COALESCE(v_event.previous_value, '{}'::jsonb);
        v_after := v_prop;
    END IF;

    -- 4. Advance Baseline Hash in Source Registry
    v_new_hash := COALESCE(v_prop->>'currentHash', v_cand->>'currentHash');
    IF v_new_hash IS NOT NULL THEN
        UPDATE public.college_source_registry
        SET last_content_hash = v_new_hash,
            last_changed_at = now(),
            updated_at = now()
        WHERE id = v_event.source_id;
    END IF;

    -- 5. Write Immutable Audit Record
    INSERT INTO public.college_audit_log (
        event_id,
        college_id,
        course_id,
        modified_by,
        before_state,
        after_state,
        change_type,
        notes
    ) VALUES (
        p_event_id,
        v_event.college_id,
        v_event.course_id,
        p_admin_id,
        COALESCE(v_before, '{}'::jsonb),
        COALESCE(v_after, '{}'::jsonb),
        v_event.event_type,
        p_notes
    )
    RETURNING id INTO v_audit_id;

    -- 6. Update Change Event to Terminal State APPLIED
    UPDATE public.college_data_change_events
    SET status = 'APPLIED',
        reviewer_id = p_admin_id,
        reviewed_at = now(),
        applied_at = now(),
        updated_at = now()
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', p_event_id,
        'audit_id', v_audit_id,
        'status', 'APPLIED'
    );
END;
$$;

COMMIT;
