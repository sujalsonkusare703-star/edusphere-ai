-- ==============================================================================
-- EduSphere AI — Final Bulk Integration Result Verification (Read-Only)
-- File: lib/supabase/verify_phase_bulk_pune_dataset_results.sql
-- Description: Returns a tabular SELECT result set of all 20 verification
--              assertions with columns (test_no, test_name, expected, actual, status).
-- Security: 100% READ-ONLY. Zero mutations, zero schema alterations, zero DDL/DML.
-- ==============================================================================

WITH metrics AS (
    SELECT
        (SELECT COUNT(*) FROM public.colleges) AS count_colleges,
        (SELECT COUNT(*) FROM public.colleges WHERE NOT (id::text LIKE '00000000-0000-0004-%')) AS count_baseline_colleges,
        (SELECT COUNT(*) FROM public.colleges WHERE id::text LIKE '00000000-0000-0004-%') AS count_migrated_colleges,
        (SELECT COUNT(*) FROM public.universities) AS count_universities,
        (SELECT COUNT(*) FROM public.sources) AS count_sources,
        (SELECT COUNT(*) FROM public.programs) AS count_programs,
        (SELECT COUNT(*) FROM public.college_courses) AS count_college_courses,
        (SELECT COUNT(*) FROM public.college_courses WHERE id::text LIKE '00000000-0000-0005-%') AS count_new_college_courses,
        (SELECT COUNT(*) FROM public.admissions) AS count_admissions,
        (SELECT COUNT(*) FROM public.cutoffs) AS count_cutoffs,
        (SELECT COUNT(*) FROM public.college_cutoffs) AS count_college_cutoffs,
        (SELECT COUNT(*) FROM public.college_cutoffs WHERE id::text LIKE '00000000-0000-0006-%') AS count_new_college_cutoffs,
        (SELECT COUNT(*) FROM public.fees) AS count_fees,
        (SELECT COUNT(*) FROM public.facilities) AS count_facilities,
        (SELECT COUNT(*) FROM public.accreditations) AS count_accreditations,
        (SELECT COUNT(*) FROM public.placements) AS count_placements,
        (SELECT COUNT(*) FROM public.placements WHERE NOT (id::text LIKE '00000000-0000-0007-%') AND company IS NOT NULL AND role IS NOT NULL) AS count_placements_demo_intact,
        (SELECT COUNT(*) FROM public.placements WHERE id::text LIKE '00000000-0000-0007-%' AND metric_name IS NOT NULL) AS count_placements_new_metrics,
        (SELECT COUNT(*) FROM public.placements WHERE id::text LIKE '00000000-0000-0007-%' AND company IS NULL) AS count_placements_null_company,
        (SELECT COUNT(*) FROM public.placements WHERE id::text LIKE '00000000-0000-0007-%' AND role IS NULL) AS count_placements_null_role,
        (SELECT COUNT(*) FROM public.placements WHERE college_id IS NOT NULL AND college_id NOT IN (SELECT id FROM public.colleges)) AS count_placements_orphan_colleges,
        (SELECT (COUNT(*) - COUNT(DISTINCT id)) FROM public.placements) AS count_placements_duplicate_ids,
        (SELECT COUNT(*) FROM public.scholarships) AS count_scholarships,
        (SELECT COUNT(*) FROM public.institution_sources) AS count_institution_sources,
        (SELECT COUNT(*) FROM public.admission_sources) AS count_admission_sources,
        (SELECT COUNT(*) FROM public.verification_audit) AS count_verification_audit,
        (SELECT COUNT(*) FROM public.programs p LEFT JOIN public.colleges c ON p.college_id = c.id WHERE c.id IS NULL) AS count_fk_orphans,
        (SELECT COUNT(*) FROM public.staging_bulk_review_queue) AS count_staging_review_queue
)
SELECT * FROM (
    SELECT
        1 AS test_no,
        'public.colleges total count' AS test_name,
        '340' AS expected,
        count_colleges::text AS actual,
        CASE WHEN count_colleges = 340 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        2 AS test_no,
        'Baseline colleges untouched' AS test_name,
        '59' AS expected,
        count_baseline_colleges::text AS actual,
        CASE WHEN count_baseline_colleges = 59 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        3 AS test_no,
        'Migrated Pune colleges count' AS test_name,
        '281' AS expected,
        count_migrated_colleges::text AS actual,
        CASE WHEN count_migrated_colleges = 281 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        4 AS test_no,
        'public.universities count' AS test_name,
        '40' AS expected,
        count_universities::text AS actual,
        CASE WHEN count_universities = 40 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        5 AS test_no,
        'public.sources count' AS test_name,
        '419' AS expected,
        count_sources::text AS actual,
        CASE WHEN count_sources = 419 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        6 AS test_no,
        'public.programs count' AS test_name,
        '21' AS expected,
        count_programs::text AS actual,
        CASE WHEN count_programs = 21 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        7 AS test_no,
        'public.college_courses (total and new integrated)' AS test_name,
        '245 total (224 original + 21 new)' AS expected,
        count_college_courses || ' total (' || (count_college_courses - count_new_college_courses) || ' original + ' || count_new_college_courses || ' new)' AS actual,
        CASE WHEN count_college_courses = 245 AND count_new_college_courses = 21 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        8 AS test_no,
        'public.admissions count' AS test_name,
        '21' AS expected,
        count_admissions::text AS actual,
        CASE WHEN count_admissions = 21 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        9 AS test_no,
        'public.cutoffs count' AS test_name,
        '8' AS expected,
        count_cutoffs::text AS actual,
        CASE WHEN count_cutoffs = 8 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        10 AS test_no,
        'public.college_cutoffs (total and new integrated)' AS test_name,
        '162 total (154 original + 8 new)' AS expected,
        count_college_cutoffs || ' total (' || (count_college_cutoffs - count_new_college_cutoffs) || ' original + ' || count_new_college_cutoffs || ' new)' AS actual,
        CASE WHEN count_college_cutoffs = 162 AND count_new_college_cutoffs = 8 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        11 AS test_no,
        'public.fees count' AS test_name,
        '3' AS expected,
        count_fees::text AS actual,
        CASE WHEN count_fees = 3 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        12 AS test_no,
        'public.facilities count' AS test_name,
        '47' AS expected,
        count_facilities::text AS actual,
        CASE WHEN count_facilities = 47 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        13 AS test_no,
        'public.accreditations count' AS test_name,
        '19' AS expected,
        count_accreditations::text AS actual,
        CASE WHEN count_accreditations = 19 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        14 AS test_no,
        'public.placements dual-model integrity' AS test_name,
        '34 total (9 demo intact, 25 new metrics, 25 NULL co/role, 0 orphans, 0 dups)' AS expected,
        count_placements || ' total (' || count_placements_demo_intact || ' demo, ' || count_placements_new_metrics || ' new, ' || count_placements_null_company || ' null company, ' || count_placements_null_role || ' null role, ' || count_placements_orphan_colleges || ' orphans, ' || count_placements_duplicate_ids || ' dups)' AS actual,
        CASE WHEN count_placements = 34 
                  AND count_placements_demo_intact = 9 
                  AND count_placements_new_metrics = 25 
                  AND count_placements_null_company = 25 
                  AND count_placements_null_role = 25 
                  AND count_placements_orphan_colleges = 0 
                  AND count_placements_duplicate_ids = 0 
             THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        15 AS test_no,
        'public.scholarships count' AS test_name,
        '1' AS expected,
        count_scholarships::text AS actual,
        CASE WHEN count_scholarships = 1 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        16 AS test_no,
        'public.institution_sources count' AS test_name,
        '304' AS expected,
        count_institution_sources::text AS actual,
        CASE WHEN count_institution_sources = 304 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        17 AS test_no,
        'public.admission_sources count' AS test_name,
        '51' AS expected,
        count_admission_sources::text AS actual,
        CASE WHEN count_admission_sources = 51 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        18 AS test_no,
        'public.verification_audit count' AS test_name,
        '85' AS expected,
        count_verification_audit::text AS actual,
        CASE WHEN count_verification_audit = 85 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        19 AS test_no,
        'Zero orphan programs -> colleges' AS test_name,
        '0' AS expected,
        count_fk_orphans::text AS actual,
        CASE WHEN count_fk_orphans = 0 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics

    UNION ALL

    SELECT
        20 AS test_no,
        'public.staging_bulk_review_queue count' AS test_name,
        '>= 163' AS expected,
        count_staging_review_queue::text AS actual,
        CASE WHEN count_staging_review_queue >= 163 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM metrics
) results
ORDER BY test_no ASC;
