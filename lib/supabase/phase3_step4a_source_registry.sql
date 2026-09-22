-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 STEP 4A: SOURCE REGISTRY FOUNDATION
-- 1. Safely widens college_cutoffs columns to NUMERIC(10,2) if NUMERIC(5,2).
-- 2. Safely adds created_at and updated_at to public.colleges.
-- 3. Creates public.college_source_registry table with RLS & unique constraint.
-- 4. Seeds verified, authoritative official sources (43 safe sources for 30 verified colleges).
-- Idempotent, non-destructive, safe to rerun.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CUTOFF NUMERIC PRECISION SAFETY
-- Widens cutoff_open, cutoff_obc, cutoff_sc, cutoff_st to NUMERIC(10,2) to support ranks
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'college_cutoffs' 
          AND column_name = 'cutoff_open' 
          AND (numeric_precision = 5 OR numeric_precision IS NULL)
    ) THEN
        ALTER TABLE public.college_cutoffs 
            ALTER COLUMN cutoff_open TYPE NUMERIC(10,2),
            ALTER COLUMN cutoff_obc TYPE NUMERIC(10,2),
            ALTER COLUMN cutoff_sc TYPE NUMERIC(10,2),
            ALTER COLUMN cutoff_st TYPE NUMERIC(10,2);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. COLLEGE TIMESTAMP SAFETY
-- Adds created_at and updated_at to public.colleges if missing
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'colleges' 
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
        UPDATE public.colleges SET created_at = now() WHERE created_at IS NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'colleges' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        UPDATE public.colleges SET updated_at = now() WHERE updated_at IS NULL;
    END IF;
END $$;

-- Generic update timestamp trigger function if not exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for public.colleges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_colleges_updated_at'
    ) THEN
        CREATE TRIGGER trg_colleges_updated_at
        BEFORE UPDATE ON public.colleges
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. CREATE PUBLIC.COLLEGE_SOURCE_REGISTRY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.college_source_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_college_source UNIQUE (college_id, source_url, source_type)
);

-- Trigger for public.college_source_registry
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_college_source_registry_updated_at'
    ) THEN
        CREATE TRIGGER trg_college_source_registry_updated_at
        BEFORE UPDATE ON public.college_source_registry
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_source_registry_college_id ON public.college_source_registry(college_id);
CREATE INDEX IF NOT EXISTS idx_source_registry_active ON public.college_source_registry(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_source_registry_source_type ON public.college_source_registry(source_type);

-- ------------------------------------------------------------------------------
-- 4. RLS POLICIES FOR PUBLIC.COLLEGE_SOURCE_REGISTRY
-- Read-only public access. No client INSERT / UPDATE / DELETE.
-- ------------------------------------------------------------------------------
ALTER TABLE public.college_source_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_source_registry' 
          AND policyname = 'Allow public read access to college_source_registry'
    ) THEN
        CREATE POLICY "Allow public read access to college_source_registry" 
        ON public.college_source_registry FOR SELECT USING (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. SEED SAFE, AUTHORITATIVE SOURCES (43 Verified Records for 30 Verified Institutions)
-- ------------------------------------------------------------------------------
INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d34',
    'Birla Institute of Technology and Science (BITS Pilani) Official Portal',
    'https://www.bits-pilani.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Birla Institute of Technology and Science (BITS Pilani)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d34',
    'BITS Pilani Undergraduate Admissions',
    'https://www.bitsadmission.com',
    'ADMISSION_PAGE',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Birla Institute of Technology and Science (BITS Pilani)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d32',
    'COEP Technological University Official Portal',
    'https://www.coeptech.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for COEP Technological University'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d32',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for COEP Technological University'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0002-000000000005',
    'MIT WPU Official Portal',
    'https://mitwpu.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for MIT WPU'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0002-000000000005',
    'MIT-WPU Undergraduate Admissions Portal',
    'https://mitwpu.edu.in/admissions',
    'ADMISSION_PAGE',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for MIT WPU'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000022',
    'ILS Law College Official Portal',
    'https://ilslaw.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for ILS Law College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000022',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for ILS Law College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d35',
    'Vellore Institute of Technology (VIT) Official Portal',
    'https://vit.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Vellore Institute of Technology (VIT)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d36',
    'International Institute of Information Technology Hyderabad (IIIT-H) Official Portal',
    'https://www.iiit.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for International Institute of Information Technology Hyderabad (IIIT-H)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d36',
    'IIIT Hyderabad Undergraduate Admissions Portal',
    'https://ugadmissions.iiit.ac.in',
    'ADMISSION_PAGE',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for International Institute of Information Technology Hyderabad (IIIT-H)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d37',
    'Delhi Technological University (DTU) Official Portal',
    'https://www.dtu.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Delhi Technological University (DTU)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d37',
    'Joint Admission Counselling (JAC) Delhi',
    'https://jacdelhi.admissions.nic.in',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Delhi Technological University (DTU)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d38',
    'RV College of Engineering Official Portal',
    'https://www.rvce.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for RV College of Engineering'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0002-00000000000b',
    'Army Institute of Technology Official Portal',
    'https://www.aitpune.com',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Army Institute of Technology'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000023',
    'Symbiosis Law School Pune Official Portal',
    'https://www.symlaw.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Symbiosis Law School Pune'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000024',
    'Bharati Vidyapeeth New Law College Official Portal',
    'https://nlc.bharatividyapeeth.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Bharati Vidyapeeth New Law College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002e',
    'BKPS Architecture Official Portal',
    'https://bkps.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for BKPS Architecture'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002e',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for BKPS Architecture'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002f',
    'Sinhgad Architecture Official Portal',
    'https://scoa.sinhgad.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Sinhgad Architecture'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002f',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Sinhgad Architecture'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000025',
    'DES Navalmal Firodia Law College Official Portal',
    'https://deslaw.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for DES Navalmal Firodia Law College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000025',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for DES Navalmal Firodia Law College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d33',
    'Indian Institute of Technology Bombay (IIT Bombay) Official Portal',
    'https://www.iitb.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Indian Institute of Technology Bombay (IIT Bombay)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d33',
    'Joint Seat Allocation Authority (JoSAA)',
    'https://josaa.nic.in',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Indian Institute of Technology Bombay (IIT Bombay)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d33',
    'IIT Bombay Academic Office',
    'https://acad.iitb.ac.in',
    'ADMISSION_PAGE',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Indian Institute of Technology Bombay (IIT Bombay)'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0000-00636f6c2d31',
    'MIT ADT University Official Portal',
    'https://mituniversity.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for MIT ADT University'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000030',
    'Ajeenkya DY Patil University Official Portal',
    'https://adypu.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Ajeenkya DY Patil University'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000031',
    'Flame University Official Portal',
    'https://www.flame.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Flame University'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000032',
    'Christ University Pune Lavasa Official Portal',
    'https://lavasa.christuniversity.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Christ University Pune Lavasa'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000032',
    'Christ University Central Portal',
    'https://christuniversity.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for Christ University Pune Lavasa'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000027',
    'Symbiosis Institute of Computer Studies Official Portal',
    'https://www.sicsr.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Symbiosis Institute of Computer Studies'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002d',
    'Symbiosis Institute of Design Official Portal',
    'https://www.sid.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Symbiosis Institute of Design'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002c',
    'MIT Institute of Design Official Portal',
    'https://mitid.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for MIT Institute of Design'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002a',
    'Poona College of Pharmacy Official Portal',
    'https://pcp.bharatividyapeeth.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Poona College of Pharmacy'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002b',
    'DY Patil Pharmacy Official Portal',
    'https://pharmacy.dypvp.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for DY Patil Pharmacy'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000002b',
    'State Common Entrance Test Cell, Maharashtra',
    'https://cetcell.mahacet.org',
    'EXAM_AUTHORITY',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Verified admission authority/portal for DY Patil Pharmacy'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-00000000001f',
    'Fergusson College Official Portal',
    'https://www.fergusson.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Fergusson College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000029',
    'Fergusson BCA Official Portal',
    'https://www.fergusson.edu',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Fergusson BCA'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000020',
    'BMCC Official Portal',
    'https://www.bmcc.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for BMCC'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000021',
    'Modern College Official Portal',
    'https://moderncollegepune.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Modern College'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000028',
    'Modern College BCA Official Portal',
    'https://moderncollegepune.edu.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for Modern College BCA'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO public.college_source_registry (
    college_id, source_name, source_url, source_type, content_format, selector_config, check_frequency_days, is_active, notes
) VALUES (
    '00000000-0000-0000-0003-000000000026',
    'ISB&M Pune Official Portal',
    'https://www.isbm.ac.in',
    'OFFICIAL_PORTAL',
    'HTML',
    '{}'::jsonb,
    7,
    true,
    'Official institutional portal verified for ISB&M Pune'
) ON CONFLICT (college_id, source_url, source_type) DO UPDATE SET
    source_name = EXCLUDED.source_name,
    content_format = EXCLUDED.content_format,
    check_frequency_days = EXCLUDED.check_frequency_days,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes,
    updated_at = now();

COMMIT;
