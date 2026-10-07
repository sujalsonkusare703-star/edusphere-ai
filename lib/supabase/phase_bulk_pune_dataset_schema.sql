-- ==============================================================================
-- EDUSPHERE AI — BULK DATASET INTEGRATION SPRINT
-- CONSOLIDATED ADDITIVE SCHEMA DEFINITION
-- Safe, non-destructive, idempotent DDL migration.
-- Preserves all existing tables, views, and data.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ADDITIVE COLUMNS ON EXISTING PRODUCTION TABLES
-- ------------------------------------------------------------------------------

-- public.colleges
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS university_id INT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS source_id INT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS notes TEXT;

-- public.college_courses
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS canonical_program_id INT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS field TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS sub_field TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS degree_level TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS degree TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS duration_years TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS source_id INT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.college_courses ADD COLUMN IF NOT EXISTS notes TEXT;

-- public.college_cutoffs
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS canonical_cutoff_id INT;
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS canonical_program_id INT;
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS choice_code TEXT;
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS seat_type TEXT;
ALTER TABLE public.college_cutoffs ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- public.placements
ALTER TABLE public.placements ALTER COLUMN company DROP NOT NULL;
ALTER TABLE public.placements ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS program_id INT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS metric_name TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS metric_value TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS metric_unit TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS placement_year TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS recruiters TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS internship_details TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS source_id INT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.placements ADD COLUMN IF NOT EXISTS notes TEXT;

-- ------------------------------------------------------------------------------
-- 2. CANONICAL ENTITY MASTER TABLES (IF NOT EXISTS)
-- ------------------------------------------------------------------------------

-- public.sources
CREATE TABLE IF NOT EXISTS public.sources (
    source_id INT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT,
    organization TEXT,
    url TEXT,
    publication_year INT,
    retrieved_at DATE,
    sha256 TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.universities
CREATE TABLE IF NOT EXISTS public.universities (
    university_id INT PRIMARY KEY,
    official_name TEXT NOT NULL,
    university_type TEXT,
    ownership TEXT,
    state TEXT,
    district TEXT,
    city TEXT,
    official_website TEXT,
    source_id INT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.programs
CREATE TABLE IF NOT EXISTS public.programs (
    program_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    field TEXT,
    sub_field TEXT,
    degree_level TEXT,
    degree TEXT,
    official_program_name TEXT NOT NULL,
    specialization TEXT,
    duration_years TEXT,
    mode TEXT,
    intake TEXT,
    course_url TEXT,
    academic_year TEXT,
    source_id INT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.admissions
CREATE TABLE IF NOT EXISTS public.admissions (
    admission_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    program_id INT REFERENCES public.programs(program_id) ON DELETE CASCADE,
    admission_route TEXT,
    entrance_exam TEXT,
    admission_authority TEXT,
    eligibility TEXT,
    required_subjects TEXT,
    minimum_marks TEXT,
    other_requirements TEXT,
    application_url TEXT,
    academic_year TEXT,
    important_dates TEXT,
    source_id INT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.cutoffs
CREATE TABLE IF NOT EXISTS public.cutoffs (
    cutoff_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    program_id INT REFERENCES public.programs(program_id) ON DELETE CASCADE,
    choice_code TEXT,
    exam TEXT,
    admission_route TEXT,
    academic_year TEXT,
    round TEXT,
    category TEXT,
    quota TEXT,
    seat_type TEXT,
    cutoff_type TEXT,
    cutoff_value TEXT,
    cutoff_unit TEXT,
    source_id INT,
    source_url TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.fees
CREATE TABLE IF NOT EXISTS public.fees (
    fee_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    program_id INT,
    academic_year TEXT,
    tuition_fee DECIMAL(12,2),
    development_fee DECIMAL(12,2),
    mandatory_charges DECIMAL(12,2),
    total_annual_academic_fee DECIMAL(12,2),
    hostel_fee DECIMAL(12,2),
    other_compulsory_charges DECIMAL(12,2),
    fee_category TEXT,
    currency TEXT DEFAULT 'INR',
    source_id INT,
    source_url TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.facilities
CREATE TABLE IF NOT EXISTS public.facilities (
    facility_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    facility_type TEXT NOT NULL,
    description TEXT,
    capacity TEXT,
    academic_year TEXT,
    source_id INT,
    source_url TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.accreditations
CREATE TABLE IF NOT EXISTS public.accreditations (
    accreditation_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    program_id INT,
    body TEXT NOT NULL,
    record_type TEXT,
    approval_identifier TEXT,
    status TEXT,
    grade TEXT,
    valid_from DATE,
    valid_to DATE,
    academic_year TEXT,
    scope TEXT,
    source_id INT,
    source_url TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.scholarships
CREATE TABLE IF NOT EXISTS public.scholarships (
    scholarship_id INT PRIMARY KEY,
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    program_id INT,
    name TEXT NOT NULL,
    provider TEXT,
    eligibility TEXT,
    category TEXT,
    benefit TEXT,
    academic_year TEXT,
    application_url TEXT,
    source_id INT,
    source_url TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.institution_sources
CREATE TABLE IF NOT EXISTS public.institution_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    source_id INT,
    source_page TEXT,
    evidence TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    last_verified DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.admission_sources
CREATE TABLE IF NOT EXISTS public.admission_sources (
    admission_source_id INT PRIMARY KEY,
    admission_id INT,
    source_id INT,
    source_url TEXT,
    evidence TEXT,
    verification_status TEXT DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.verification_audit
CREATE TABLE IF NOT EXISTS public.verification_audit (
    audit_id INT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source_id INT,
    audit_date DATE,
    reviewer TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.staging_bulk_review_queue
CREATE TABLE IF NOT EXISTS public.staging_bulk_review_queue (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    source_id_or_code TEXT NOT NULL,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'REVIEW',
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'sources', 'universities', 'programs', 'admissions', 'cutoffs',
        'fees', 'facilities', 'accreditations', 'scholarships',
        'institution_sources', 'admission_sources', 'verification_audit',
        'staging_bulk_review_queue'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Drop existing policy if any, then re-create
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow public read access" ON public.%I FOR SELECT USING (true);', tbl);
    END LOOP;
END $$;

COMMIT;
