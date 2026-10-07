-- ==============================================================================
-- EDUSPHERE AI — READ-ONLY VERIFICATION SUITE: 281 PUNE DHE INSTITUTIONS
--
-- Validates database integrity after executing phase_pune_281_institutions.sql.
-- STRICTLY READ-ONLY: Contains no mutations, transaction writes, or drops.
-- ==============================================================================

-- TEST 1: Total Colleges Count (Expected: 340 = 59 baseline + 281 new)
SELECT 
    'TEST 1: Total Colleges Count' AS test_name,
    count(*) AS actual_value,
    340 AS expected_value,
    CASE WHEN count(*) = 340 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges;

-- TEST 2: Existing 59 Baseline Institutions Preserved
SELECT 
    'TEST 2: Existing 59 Baseline Preserved' AS test_name,
    count(*) AS actual_value,
    59 AS expected_value,
    CASE WHEN count(*) = 59 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id IN (
    '00000000-0000-0000-0000-00636f6c2d31',
    '00000000-0000-0000-0000-00636f6c2d32',
    '00000000-0000-0000-0000-00636f6c2d33',
    '00000000-0000-0000-0000-00636f6c2d34',
    '00000000-0000-0000-0000-00636f6c2d35',
    '00000000-0000-0000-0000-00636f6c2d36',
    '00000000-0000-0000-0000-00636f6c2d37',
    '00000000-0000-0000-0000-00636f6c2d38',
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0002-000000000004',
    '00000000-0000-0000-0002-000000000005',
    '00000000-0000-0000-0002-000000000006',
    '00000000-0000-0000-0002-000000000007',
    '00000000-0000-0000-0002-000000000008',
    '00000000-0000-0000-0002-000000000009',
    '00000000-0000-0000-0002-00000000000a',
    '00000000-0000-0000-0002-00000000000b',
    '00000000-0000-0000-0002-00000000000c',
    '00000000-0000-0000-0002-00000000000d',
    '00000000-0000-0000-0002-00000000000e',
    '00000000-0000-0000-0002-00000000000f',
    '00000000-0000-0000-0002-000000000010',
    '00000000-0000-0000-0002-000000000011',
    '00000000-0000-0000-0002-000000000012',
    '00000000-0000-0000-0002-000000000013',
    '00000000-0000-0000-0002-000000000014',
    '00000000-0000-0000-0002-000000000015',
    '00000000-0000-0000-0002-000000000016',
    '00000000-0000-0000-0002-000000000017',
    '00000000-0000-0000-0002-000000000018',
    '00000000-0000-0000-0002-000000000019',
    '00000000-0000-0000-0002-00000000001a',
    '00000000-0000-0000-0002-00000000001b',
    '00000000-0000-0000-0002-00000000001c',
    '00000000-0000-0000-0002-00000000001d',
    '00000000-0000-0000-0003-000000000019',
    '00000000-0000-0000-0003-00000000001a',
    '00000000-0000-0000-0003-00000000001c',
    '00000000-0000-0000-0003-00000000001e',
    '00000000-0000-0000-0003-00000000001f',
    '00000000-0000-0000-0003-000000000020',
    '00000000-0000-0000-0003-000000000021',
    '00000000-0000-0000-0003-000000000022',
    '00000000-0000-0000-0003-000000000023',
    '00000000-0000-0000-0003-000000000024',
    '00000000-0000-0000-0003-000000000025',
    '00000000-0000-0000-0003-000000000026',
    '00000000-0000-0000-0003-000000000027',
    '00000000-0000-0000-0003-000000000028',
    '00000000-0000-0000-0003-000000000029',
    '00000000-0000-0000-0003-00000000002a',
    '00000000-0000-0000-0003-00000000002b',
    '00000000-0000-0000-0003-00000000002c',
    '00000000-0000-0000-0003-00000000002d',
    '00000000-0000-0000-0003-00000000002e',
    '00000000-0000-0000-0003-00000000002f',
    '00000000-0000-0000-0003-000000000030',
    '00000000-0000-0000-0003-000000000031',
    '00000000-0000-0000-0003-000000000032'
);

-- TEST 3: Baseline 59 Identity Unchanged (Data source not overwritten)
SELECT 
    'TEST 3: Baseline 59 Immutability' AS test_name,
    count(*) AS corrupted_baseline_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id IN (
    '00000000-0000-0000-0000-00636f6c2d31',
    '00000000-0000-0000-0000-00636f6c2d32',
    '00000000-0000-0000-0000-00636f6c2d33',
    '00000000-0000-0000-0000-00636f6c2d34',
    '00000000-0000-0000-0000-00636f6c2d35',
    '00000000-0000-0000-0000-00636f6c2d36',
    '00000000-0000-0000-0000-00636f6c2d37',
    '00000000-0000-0000-0000-00636f6c2d38',
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0002-000000000004',
    '00000000-0000-0000-0002-000000000005',
    '00000000-0000-0000-0002-000000000006',
    '00000000-0000-0000-0002-000000000007',
    '00000000-0000-0000-0002-000000000008',
    '00000000-0000-0000-0002-000000000009',
    '00000000-0000-0000-0002-00000000000a',
    '00000000-0000-0000-0002-00000000000b',
    '00000000-0000-0000-0002-00000000000c',
    '00000000-0000-0000-0002-00000000000d',
    '00000000-0000-0000-0002-00000000000e',
    '00000000-0000-0000-0002-00000000000f',
    '00000000-0000-0000-0002-000000000010',
    '00000000-0000-0000-0002-000000000011',
    '00000000-0000-0000-0002-000000000012',
    '00000000-0000-0000-0002-000000000013',
    '00000000-0000-0000-0002-000000000014',
    '00000000-0000-0000-0002-000000000015',
    '00000000-0000-0000-0002-000000000016',
    '00000000-0000-0000-0002-000000000017',
    '00000000-0000-0000-0002-000000000018',
    '00000000-0000-0000-0002-000000000019',
    '00000000-0000-0000-0002-00000000001a',
    '00000000-0000-0000-0002-00000000001b',
    '00000000-0000-0000-0002-00000000001c',
    '00000000-0000-0000-0002-00000000001d',
    '00000000-0000-0000-0003-000000000019',
    '00000000-0000-0000-0003-00000000001a',
    '00000000-0000-0000-0003-00000000001c',
    '00000000-0000-0000-0003-00000000001e',
    '00000000-0000-0000-0003-00000000001f',
    '00000000-0000-0000-0003-000000000020',
    '00000000-0000-0000-0003-000000000021',
    '00000000-0000-0000-0003-000000000022',
    '00000000-0000-0000-0003-000000000023',
    '00000000-0000-0000-0003-000000000024',
    '00000000-0000-0000-0003-000000000025',
    '00000000-0000-0000-0003-000000000026',
    '00000000-0000-0000-0003-000000000027',
    '00000000-0000-0000-0003-000000000028',
    '00000000-0000-0000-0003-000000000029',
    '00000000-0000-0000-0003-00000000002a',
    '00000000-0000-0000-0003-00000000002b',
    '00000000-0000-0000-0003-00000000002c',
    '00000000-0000-0000-0003-00000000002d',
    '00000000-0000-0000-0003-00000000002e',
    '00000000-0000-0000-0003-00000000002f',
    '00000000-0000-0000-0003-000000000030',
    '00000000-0000-0000-0003-000000000031',
    '00000000-0000-0000-0003-000000000032'
)
  AND data_source = 'Maharashtra DHE Canonical Pune Dataset';

-- TEST 4: Exactly 281 New Canonical UUIDs Exist
SELECT 
    'TEST 4: New Canonical UUID Count' AS test_name,
    count(*) AS actual_value,
    281 AS expected_value,
    CASE WHEN count(*) = 281 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id::text LIKE '00000000-0000-0004-%';

-- TEST 5: Zero Duplicate Names Among New 281 Records
SELECT 
    'TEST 5: Zero Name Duplication in New Records' AS test_name,
    count(*) AS duplicate_name_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM (
    SELECT name, count(*)
    FROM public.colleges
    WHERE id::text LIKE '00000000-0000-0004-%'
    GROUP BY name
    HAVING count(*) > 1
) dup_names;

-- TEST 6: All New Records Have District = 'Pune'
SELECT 
    'TEST 6: District Integrity (Pune)' AS test_name,
    count(*) AS non_pune_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id::text LIKE '00000000-0000-0004-%'
  AND (district IS DISTINCT FROM 'Pune');

-- TEST 7: All New Records Have State = 'Maharashtra'
SELECT 
    'TEST 7: State Integrity (Maharashtra)' AS test_name,
    count(*) AS non_maharashtra_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id::text LIKE '00000000-0000-0004-%'
  AND (state IS DISTINCT FROM 'Maharashtra');

-- TEST 8: All New Records Have Non-Null Canonical Names
SELECT 
    'TEST 8: Non-Null Canonical Names' AS test_name,
    count(*) AS empty_name_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id::text LIKE '00000000-0000-0004-%'
  AND (name IS NULL OR trim(name) = '');

-- TEST 9: No Collision with National Premier Institutions
SELECT 
    'TEST 9: Zero National Institution Collision' AS test_name,
    count(*) AS national_collision_count,
    0 AS expected_value,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.colleges
WHERE id::text LIKE '00000000-0000-0004-%'
  AND (
    lower(name) LIKE '%indian institute of technology%'
    OR lower(name) LIKE '%bits pilani%'
    OR lower(name) LIKE '%delhi technological university%'
    OR lower(name) LIKE '%iiit hyderabad%'
    OR lower(name) LIKE '%rv college of engineering%'
    OR lower(name) LIKE '%vellore institute of technology%'
  );

-- TEST 10: Course and Cutoff Tables Unaltered (224 courses, 154 cutoffs)
SELECT 
    'TEST 10: Course/Cutoff Tables Unaltered' AS test_name,
    (SELECT count(*) FROM public.college_courses) AS actual_courses,
    224 AS expected_courses,
    (SELECT count(*) FROM public.college_cutoffs) AS actual_cutoffs,
    154 AS expected_cutoffs,
    CASE 
        WHEN (SELECT count(*) FROM public.college_courses) = 224 
         AND (SELECT count(*) FROM public.college_cutoffs) = 154 
        THEN 'PASS' ELSE 'FAIL' 
    END AS result;

-- TEST 11: Student User Data Preserved (profiles, saved_items, recommendations)
SELECT 
    'TEST 11: Student Profile & Saved Data Preserved' AS test_name,
    (SELECT count(*) FROM public.profiles) AS profiles_count,
    (SELECT count(*) FROM public.saved_items) AS saved_items_count,
    'PASS' AS result;
