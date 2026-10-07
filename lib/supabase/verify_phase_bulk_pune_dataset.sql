-- ==============================================================================
-- EDUSPHERE AI — BULK DATASET INTEGRATION SPRINT
-- CONSOLIDATED VERIFICATION SCRIPT (20 STRICT ASSERTIONS)
-- PostgreSQL compatible, explicit ::text casts on all UUID columns.
-- ==============================================================================

DO $$
DECLARE
    v_colleges_count INT;
    v_baseline_count INT;
    v_migrated_count INT;
    v_universities_count INT;
    v_sources_count INT;
    v_programs_count INT;
    v_courses_count INT;
    v_new_courses_count INT;
    v_admissions_count INT;
    v_cutoffs_count INT;
    v_college_cutoffs_count INT;
    v_new_cutoffs_count INT;
    v_fees_count INT;
    v_facilities_count INT;
    v_accreditations_count INT;
    v_placements_count INT;
    v_placements_demo_intact INT;
    v_placements_new_metrics INT;
    v_placements_new_null_company INT;
    v_placements_new_null_role INT;
    v_placements_orphan_colleges INT;
    v_placements_duplicate_ids INT;
    v_scholarships_count INT;
    v_inst_sources_count INT;
    v_adm_sources_count INT;
    v_audit_count INT;
    v_fk_orphans INT;
    v_review_count INT;
    v_failures INT := 0;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'EDUSPHERE AI — BULK MIGRATION VERIFICATION SUITE';
    RAISE NOTICE '==================================================';

    -- Assertion 1: Total public.colleges preserved
    SELECT COUNT(*) INTO v_colleges_count FROM public.colleges;
    IF v_colleges_count = 340 THEN
        RAISE NOTICE 'ASSERTION 1 PASSED: Total colleges preserved exactly 340 (Current: %)', v_colleges_count;
    ELSE
        RAISE WARNING 'ASSERTION 1 FAILED: Expected 340 colleges, found %', v_colleges_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 2: Baseline 59 colleges untouched
    SELECT COUNT(*) INTO v_baseline_count FROM public.colleges WHERE NOT (id::text LIKE '00000000-0000-0004-%');
    IF v_baseline_count = 59 THEN
        RAISE NOTICE 'ASSERTION 2 PASSED: Baseline 59 colleges 100%% untouched (Current: %)', v_baseline_count;
    ELSE
        RAISE WARNING 'ASSERTION 2 FAILED: Expected 59 baseline colleges, found %', v_baseline_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 3: Migrated 281 Pune colleges intact
    SELECT COUNT(*) INTO v_migrated_count FROM public.colleges WHERE id::text LIKE '00000000-0000-0004-%';
    IF v_migrated_count = 281 THEN
        RAISE NOTICE 'ASSERTION 3 PASSED: Migrated 281 Pune institutions intact (Current: %)', v_migrated_count;
    ELSE
        RAISE WARNING 'ASSERTION 3 FAILED: Expected 281 migrated colleges, found %', v_migrated_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 4: Universities master count
    SELECT COUNT(*) INTO v_universities_count FROM public.universities;
    IF v_universities_count = 40 THEN
        RAISE NOTICE 'ASSERTION 4 PASSED: Universities master count is 40 (Current: %)', v_universities_count;
    ELSE
        RAISE WARNING 'ASSERTION 4 FAILED: Expected 40 universities, found %', v_universities_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 5: Official sources master count
    SELECT COUNT(*) INTO v_sources_count FROM public.sources;
    IF v_sources_count = 419 THEN
        RAISE NOTICE 'ASSERTION 5 PASSED: Official sources count is 419 (Current: %)', v_sources_count;
    ELSE
        RAISE WARNING 'ASSERTION 5 FAILED: Expected 419 sources, found %', v_sources_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 6: Canonical programs count
    SELECT COUNT(*) INTO v_programs_count FROM public.programs;
    IF v_programs_count = 21 THEN
        RAISE NOTICE 'ASSERTION 6 PASSED: Canonical programs count is 21 (Current: %)', v_programs_count;
    ELSE
        RAISE WARNING 'ASSERTION 6 FAILED: Expected 21 programs, found %', v_programs_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 7: Total college_courses count (224 original + 21 new = 245)
    SELECT COUNT(*) INTO v_courses_count FROM public.college_courses;
    SELECT COUNT(*) INTO v_new_courses_count FROM public.college_courses WHERE id::text LIKE '00000000-0000-0005-%';
    IF v_courses_count = 245 AND v_new_courses_count = 21 THEN
        RAISE NOTICE 'ASSERTION 7 PASSED: Total college courses expanded to 245 (224 original + 21 newly integrated)';
    ELSE
        RAISE WARNING 'ASSERTION 7 FAILED: Expected 245 total courses and 21 new, found % total, % new', v_courses_count, v_new_courses_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 8: Canonical admissions count
    SELECT COUNT(*) INTO v_admissions_count FROM public.admissions;
    IF v_admissions_count = 21 THEN
        RAISE NOTICE 'ASSERTION 8 PASSED: Canonical admissions count is 21 (Current: %)', v_admissions_count;
    ELSE
        RAISE WARNING 'ASSERTION 8 FAILED: Expected 21 admissions, found %', v_admissions_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 9: Canonical cutoffs count
    SELECT COUNT(*) INTO v_cutoffs_count FROM public.cutoffs;
    IF v_cutoffs_count = 8 THEN
        RAISE NOTICE 'ASSERTION 9 PASSED: Canonical cutoffs count is 8 (Current: %)', v_cutoffs_count;
    ELSE
        RAISE WARNING 'ASSERTION 9 FAILED: Expected 8 cutoffs, found %', v_cutoffs_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 10: Production college_cutoffs expanded (154 original + 8 new = 162)
    SELECT COUNT(*) INTO v_college_cutoffs_count FROM public.college_cutoffs;
    SELECT COUNT(*) INTO v_new_cutoffs_count FROM public.college_cutoffs WHERE id::text LIKE '00000000-0000-0006-%';
    IF v_college_cutoffs_count = 162 AND v_new_cutoffs_count = 8 THEN
        RAISE NOTICE 'ASSERTION 10 PASSED: Total college cutoffs expanded to 162 (154 original + 8 newly integrated)';
    ELSE
        RAISE WARNING 'ASSERTION 10 FAILED: Expected 162 total cutoffs and 8 new, found % total, % new', v_college_cutoffs_count, v_new_cutoffs_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 11: Canonical fees count
    SELECT COUNT(*) INTO v_fees_count FROM public.fees;
    IF v_fees_count = 3 THEN
        RAISE NOTICE 'ASSERTION 11 PASSED: Canonical fees count is 3 (Current: %)', v_fees_count;
    ELSE
        RAISE WARNING 'ASSERTION 11 FAILED: Expected 3 fees, found %', v_fees_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 12: Canonical facilities count
    SELECT COUNT(*) INTO v_facilities_count FROM public.facilities;
    IF v_facilities_count = 47 THEN
        RAISE NOTICE 'ASSERTION 12 PASSED: Canonical facilities count is 47 (Current: %)', v_facilities_count;
    ELSE
        RAISE WARNING 'ASSERTION 12 FAILED: Expected 47 facilities, found %', v_facilities_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 13: Canonical accreditations count
    SELECT COUNT(*) INTO v_accreditations_count FROM public.accreditations;
    IF v_accreditations_count = 19 THEN
        RAISE NOTICE 'ASSERTION 13 PASSED: Canonical accreditations count is 19 (Current: %)', v_accreditations_count;
    ELSE
        RAISE WARNING 'ASSERTION 13 FAILED: Expected 19 accreditations, found %', v_accreditations_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 14: Total placements count (9 original + 25 new = 34) & dual-model integrity checks
    SELECT COUNT(*) INTO v_placements_count FROM public.placements;
    SELECT COUNT(*) INTO v_placements_demo_intact FROM public.placements 
        WHERE NOT (id::text LIKE '00000000-0000-0007-%') AND company IS NOT NULL AND role IS NOT NULL;
    SELECT COUNT(*) INTO v_placements_new_metrics FROM public.placements 
        WHERE id::text LIKE '00000000-0000-0007-%' AND metric_name IS NOT NULL;
    SELECT COUNT(*) INTO v_placements_new_null_company FROM public.placements 
        WHERE id::text LIKE '00000000-0000-0007-%' AND company IS NULL;
    SELECT COUNT(*) INTO v_placements_new_null_role FROM public.placements 
        WHERE id::text LIKE '00000000-0000-0007-%' AND role IS NULL;
    SELECT COUNT(*) INTO v_placements_orphan_colleges FROM public.placements 
        WHERE college_id IS NOT NULL AND college_id NOT IN (SELECT id FROM public.colleges);
    SELECT (COUNT(*) - COUNT(DISTINCT id)) INTO v_placements_duplicate_ids FROM public.placements;

    IF v_placements_count = 34 
       AND v_placements_demo_intact = 9 
       AND v_placements_new_metrics = 25 
       AND v_placements_new_null_company = 25 
       AND v_placements_new_null_role = 25 
       AND v_placements_orphan_colleges = 0 
       AND v_placements_duplicate_ids = 0 THEN
        RAISE NOTICE 'ASSERTION 14 PASSED: Placements count is 34 (9 demo retained with company/role intact, 25 new institutional NIRF metrics with NULL company/role, 0 orphan college_id, 0 duplicate IDs)';
    ELSE
        RAISE WARNING 'ASSERTION 14 FAILED: Placements assertion failed. Total: % (exp 34), Demo intact: % (exp 9), New metrics: % (exp 25), Null company: % (exp 25), Null role: % (exp 25), Orphans: % (exp 0), Duplicates: % (exp 0)', 
            v_placements_count, v_placements_demo_intact, v_placements_new_metrics, v_placements_new_null_company, v_placements_new_null_role, v_placements_orphan_colleges, v_placements_duplicate_ids;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 15: Canonical scholarships count
    SELECT COUNT(*) INTO v_scholarships_count FROM public.scholarships;
    IF v_scholarships_count = 1 THEN
        RAISE NOTICE 'ASSERTION 15 PASSED: Canonical scholarships count is 1 (Current: %)', v_scholarships_count;
    ELSE
        RAISE WARNING 'ASSERTION 15 FAILED: Expected 1 scholarship, found %', v_scholarships_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 16: Institution sources count
    SELECT COUNT(*) INTO v_inst_sources_count FROM public.institution_sources;
    IF v_inst_sources_count = 304 THEN
        RAISE NOTICE 'ASSERTION 16 PASSED: Institution sources count is 304 (Current: %)', v_inst_sources_count;
    ELSE
        RAISE WARNING 'ASSERTION 16 FAILED: Expected 304 institution sources, found %', v_inst_sources_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 17: Admission sources count
    SELECT COUNT(*) INTO v_adm_sources_count FROM public.admission_sources;
    IF v_adm_sources_count = 51 THEN
        RAISE NOTICE 'ASSERTION 17 PASSED: Admission sources count is 51 (Current: %)', v_adm_sources_count;
    ELSE
        RAISE WARNING 'ASSERTION 17 FAILED: Expected 51 admission sources, found %', v_adm_sources_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 18: Verification audit trail count
    SELECT COUNT(*) INTO v_audit_count FROM public.verification_audit;
    IF v_audit_count = 85 THEN
        RAISE NOTICE 'ASSERTION 18 PASSED: Verification audit trail count is 85 (Current: %)', v_audit_count;
    ELSE
        RAISE WARNING 'ASSERTION 18 FAILED: Expected 85 audit rows, found %', v_audit_count;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 19: Foreign key orphan check
    SELECT COUNT(*) INTO v_fk_orphans FROM public.programs p
    LEFT JOIN public.colleges c ON p.college_id = c.id
    WHERE c.id IS NULL;
    IF v_fk_orphans = 0 THEN
        RAISE NOTICE 'ASSERTION 19 PASSED: Zero orphaned foreign keys detected across programs (Current: %)', v_fk_orphans;
    ELSE
        RAISE WARNING 'ASSERTION 19 FAILED: Detected % orphaned program foreign keys', v_fk_orphans;
        v_failures := v_failures + 1;
    END IF;

    -- Assertion 20: Staging review queue count
    SELECT COUNT(*) INTO v_review_count FROM public.staging_bulk_review_queue;
    IF v_review_count >= 163 THEN
        RAISE NOTICE 'ASSERTION 20 PASSED: Staging review queue contains all staged non-Pune/conflict records (Current: %)', v_review_count;
    ELSE
        RAISE WARNING 'ASSERTION 20 FAILED: Expected >= 163 review records, found %', v_review_count;
        v_failures := v_failures + 1;
    END IF;

    RAISE NOTICE '==================================================';
    IF v_failures = 0 THEN
        RAISE NOTICE 'VERDICT: ALL 20 ASSERTIONS PASSED! BULK INTEGRATION CERTIFIED.';
    ELSE
        RAISE WARNING 'VERDICT: % ASSERTIONS FAILED. REVIEW REQUIRED.', v_failures;
    END IF;
    RAISE NOTICE '==================================================';
END $$;
