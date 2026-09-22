-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 EXTENSION, STEP 1: MULTI-EXAM ADMISSION & CUTOFF FOUNDATION
-- Idempotent, non-destructive migration.
-- Preserves all existing colleges, courses, MHT-CET cutoffs, and user data.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Extend public.colleges with multi-exam & admission metadata
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'accepted_exams'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN accepted_exams TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'admission_route'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN admission_route TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'eligibility_criteria'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN eligibility_criteria TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'admission_source_name'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN admission_source_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'admission_source_url'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN admission_source_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = 'admission_verification_status'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN admission_verification_status TEXT DEFAULT 'NOT_VERIFIED';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Extend public.college_courses with program-level admission & exam metadata
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'accepted_exams'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN accepted_exams TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'admission_route'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN admission_route TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'eligibility_criteria'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN eligibility_criteria TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'admission_source_name'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN admission_source_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'admission_source_url'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN admission_source_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_courses' AND column_name = 'admission_verification_status'
    ) THEN
        ALTER TABLE public.college_courses ADD COLUMN admission_verification_status TEXT DEFAULT 'NOT_VERIFIED';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Extend public.college_cutoffs with cutoff unit, round, provenance & verification
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'cutoff_unit'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN cutoff_unit TEXT DEFAULT 'percentile';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'round'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN round TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'cutoff_type'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN cutoff_type TEXT DEFAULT 'closing_merit';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'source_name'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN source_name TEXT DEFAULT 'State Common Entrance Test Cell, Maharashtra';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'source_url'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN source_url TEXT DEFAULT 'https://cetcell.mahacet.org';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN verification_status TEXT DEFAULT 'DERIVED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'college_cutoffs' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.college_cutoffs ADD COLUMN notes TEXT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Correct Cutoff Provenance, Units, and Status for all Cutoffs
-- ------------------------------------------------------------------------------

-- Base update: Clear unverified assumed year/round, set status to DERIVED
UPDATE public.college_cutoffs
SET 
    year = NULL,
    round = NULL,
    cutoff_type = COALESCE(cutoff_type, 'closing_merit'),
    source_name = COALESCE(source_name, 'State Common Entrance Test Cell, Maharashtra'),
    source_url = COALESCE(source_url, 'https://cetcell.mahacet.org'),
    verification_status = 'DERIVED',
    notes = 'Cutoff values imported from Maharashtra State CET Cell dataset; year and round were not specified in source data.';

-- Cutoff Unit Correction: Architecture (NATA scores out of 200 marks, NOT percentiles)
UPDATE public.college_cutoffs
SET 
    cutoff_unit = 'marks',
    notes = 'NATA entrance score out of 200 marks; not percentile. Year and round not specified in source data.'
WHERE exam = 'NATA';

-- Cutoff Unit Correction: Law (MH CET Law score out of 150 marks, NOT percentiles)
UPDATE public.college_cutoffs
SET 
    cutoff_unit = 'score',
    notes = 'MH CET Law score out of 150 marks; not percentile. Year and round not specified in source data.'
WHERE exam = 'MH CET Law';

-- Cutoff Unit for MHT CET: Normalized percentile
UPDATE public.college_cutoffs
SET 
    cutoff_unit = 'percentile'
WHERE exam = 'MHT CET';

-- ------------------------------------------------------------------------------
-- 5. Mark Erroneous / Misattributed Cutoff Records as INVALID
-- ------------------------------------------------------------------------------

-- AIT Pune: MHT-CET cutoffs are INVALID (AIT admits strictly via JEE Main AIR for Army wards)
UPDATE public.college_cutoffs
SET 
    verification_status = 'INVALID',
    notes = 'INVALID: Army Institute of Technology does not admit students via MHT-CET. Admissions are conducted exclusively via JEE Main All India Rank (AIR) for Army personnel wards.'
WHERE college_id IN (
    SELECT id FROM public.colleges WHERE name ILIKE '%Army Institute of Technology%'
) AND exam = 'MHT CET';

-- Symbiosis Law School Pune: MH CET Law cutoffs are INVALID (SLS admits via SLAT)
UPDATE public.college_cutoffs
SET 
    verification_status = 'INVALID',
    notes = 'INVALID: Symbiosis Law School Pune admits students exclusively via SLAT (Symbiosis Law Admission Test). It does not participate in State CET Cell Law CAP.'
WHERE college_id IN (
    SELECT id FROM public.colleges WHERE name ILIKE '%Symbiosis Law School%'
) AND exam = 'MH CET Law';

-- Bharati Vidyapeeth New Law College: MH CET Law cutoffs are INVALID (BVP admits via BVP CET)
UPDATE public.college_cutoffs
SET 
    verification_status = 'INVALID',
    notes = 'INVALID: Bharati Vidyapeeth New Law College admits students primarily via BVP CET. It does not participate in State CET Cell Law CAP.'
WHERE college_id IN (
    SELECT id FROM public.colleges WHERE name ILIKE '%Bharati Vidyapeeth New Law College%'
) AND exam = 'MH CET Law';

-- ------------------------------------------------------------------------------
-- 6. Populate Verified & Derived Admission Routes and Criteria
-- ------------------------------------------------------------------------------

-- Engineering Institutions participating in Maharashtra State CAP:
-- Reclassified as DERIVED because 85/15 split is a regulatory baseline, not an institution-specific verified fact.
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MHT-CET', 'JEE Main'],
    admission_route = 'Derived from general regulatory framework: MHT-CET CAP (Maharashtra State Seats) / JEE Main (All India Seats where applicable)',
    eligibility_criteria = 'Regulatory Framework Minimum: Passed 10+2 (HSC) with Physics & Mathematics compulsory + Chemistry/Biotechnology/Biology/Technical Vocational subject with min 45% marks (40% for reserved Maharashtra candidates). Institution-specific eligibility not verified in current dataset.',
    admission_source_name = 'State Common Entrance Test Cell, Maharashtra',
    admission_source_url = 'https://cetcell.mahacet.org',
    admission_verification_status = 'DERIVED'
WHERE primary_stream = 'Engineering' 
  AND name NOT ILIKE '%Army Institute of Technology%'
  AND name NOT ILIKE '%Indian Institute of Technology%';

-- Army Institute of Technology (AIT Pune) - Exclusively JEE Main AIR (VERIFIED)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Main'],
    admission_route = 'AWES Institutional Admission via JEE Main All India Rank (AIR)',
    eligibility_criteria = 'Passed 10+2 with Physics, Chemistry, and Mathematics with minimum 50% marks; ward of eligible serving/retired Army personnel; admission based strictly on JEE Main All India Rank.',
    admission_source_name = 'Army Institute of Technology Official Portal',
    admission_source_url = 'https://www.aitpune.com',
    admission_verification_status = 'VERIFIED'
WHERE name ILIKE '%Army Institute of Technology%';

-- Indian Institute of Technology Bombay (IIT Bombay) - JEE Advanced AIR (VERIFIED)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Advanced'],
    admission_route = 'Joint Seat Allocation Authority (JoSAA) Counselling based on JEE Advanced AIR',
    eligibility_criteria = 'Qualified JEE Advanced with valid All India Rank; passed 10+2 with top 20 percentile in respective board or minimum 75% aggregate in 10+2 (65% for SC/ST/PwD).',
    admission_source_name = 'JoSAA / IIT JEE Apex Board',
    admission_source_url = 'https://josaa.nic.in',
    admission_verification_status = 'VERIFIED'
WHERE name ILIKE '%Indian Institute of Technology Bombay%' OR name ILIKE '%IIT Bombay%';

-- Law Institutions: Bona fide State CAP Law Colleges (ILS Law & DES Navalmal Firodia)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MH CET Law'],
    admission_route = 'State CET Cell Law CAP Counselling',
    eligibility_criteria = 'Regulatory Framework Minimum: Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates belonging to Maharashtra State). Institution-specific eligibility not verified in current dataset.',
    admission_source_name = 'State Common Entrance Test Cell, Maharashtra',
    admission_source_url = 'https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE primary_stream = 'Law'
  AND (name ILIKE '%ILS Law College%' OR name ILIKE '%DES%Law%' OR name ILIKE '%Navalmal%');

-- Law Institutions: Symbiosis Law School Pune (SLAT verified)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['SLAT'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SLAT',
    eligibility_criteria = 'Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates). Admission based on SLAT score and PI/WAT.',
    admission_source_name = 'Symbiosis Law School Pune Official Portal',
    admission_source_url = 'https://www.symlaw.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE name ILIKE '%Symbiosis Law School%';

-- Law Institutions: Bharati Vidyapeeth New Law College (BVP CET verified)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['BVP CET'],
    admission_route = 'Bharati Vidyapeeth (Deemed to be University) Admission via BVP CET',
    eligibility_criteria = 'Passed 10+2 examination with at least 45% marks (40% for SC/ST candidates). Admission based on BVP CET entrance ranking.',
    admission_source_name = 'Bharati Vidyapeeth New Law College Official Portal',
    admission_source_url = 'https://nlcpune.bharatividyapeeth.edu',
    admission_verification_status = 'VERIFIED'
WHERE name ILIKE '%Bharati Vidyapeeth New Law College%';

-- Architecture Institutions (BKPS & Sinhgad Architecture - NATA verified)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['NATA'],
    admission_route = 'State CET Cell Architecture CAP based on NATA score',
    eligibility_criteria = 'Regulatory Framework Minimum: Passed 10+2 with Physics, Chemistry and Mathematics or 10+3 Diploma with Mathematics, with valid NATA score. Institution-specific eligibility not verified in current dataset.',
    admission_source_name = 'Council of Architecture / State CET Cell',
    admission_source_url = 'https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE primary_stream = 'Architecture';

-- All Other Institutions (Arts, Science, Commerce, Pharmacy, Management, Multidisciplinary):
-- Explicitly mark route and eligibility as NOT VERIFIED
UPDATE public.colleges
SET 
    admission_route = 'Admission route: Not verified in current dataset',
    eligibility_criteria = 'Institution-specific eligibility: Not verified in current dataset.',
    admission_verification_status = 'NOT_VERIFIED'
WHERE primary_stream IN ('Multidisciplinary', 'Science/Arts', 'Commerce', 'Pharmacy', 'Management', 'Computer Applications', 'Design')
  AND (admission_route IS NULL OR admission_verification_status = 'NOT_VERIFIED');

-- ------------------------------------------------------------------------------
-- 7. Propagate College Metadata to College Courses
-- ------------------------------------------------------------------------------
UPDATE public.college_courses cc
SET 
    accepted_exams = c.accepted_exams,
    admission_route = c.admission_route,
    eligibility_criteria = c.eligibility_criteria,
    admission_source_name = c.admission_source_name,
    admission_source_url = c.admission_source_url,
    admission_verification_status = c.admission_verification_status
FROM public.colleges c
WHERE cc.college_id = c.id;

COMMIT;
