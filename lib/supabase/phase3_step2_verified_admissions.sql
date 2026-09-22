-- ==============================================================================
-- EDUSPHERE AI — PHASE 3 STEP 2: IMPLEMENT VERIFIED ADMISSION DATA
-- Source of Truth: docs/college-admission-verification-audit.md
-- Idempotent, non-destructive migration prepared for review.
-- DO NOT EXECUTE AUTOMATICALLY — FOR SQL REVIEW ONLY.
-- Preserves all 59 colleges, 224 programs, 154 cutoffs, and all user data.
-- 
-- CRITICAL SAFETY RULES ADHERED TO:
-- 1. Preserves college-level verified metadata in public.colleges.
-- 2. Strictly populates public.college_courses ONLY when the audit explicitly
--    verifies that exact admission information applies to that specific program (57 programs).
-- 3. Program-level evidence unavailable (general engineering branches, etc.)
--    remains DERIVED or NOT_VERIFIED. Never converts college-level VERIFIED into program-level VERIFIED.
-- 4. Disambiguates autonomous arts/science/commerce institutions (Fergusson, BMCC, Modern College)
--    by exact ID and name to never touch PES Modern COE (Engineering).
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. Correct National Institutions in public.colleges
-- ==============================================================================

-- 1.1 BITS Pilani (BITS Admission Division via BITSAT Score out of 390)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['BITSAT'],
    admission_route = 'BITS Pilani All-India Admission based on BITSAT Score (out of 390) / Board Toppers Direct',
    eligibility_criteria = 'Passed 12th examination with Physics, Chemistry, and Mathematics (PCM) with min 75% aggregate in PCM, and min 60% in each individual subject.',
    admission_source_name = 'Birla Institute of Technology and Science Admission Portal',
    admission_source_url = 'https://www.bitsadmission.com',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d34'
   OR name = 'Birla Institute of Technology and Science (BITS Pilani)';

-- 1.2 Vellore Institute of Technology (VIT Online Portal via VITEEE Rank)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['VITEEE'],
    admission_route = 'VIT All-India Online Admission based on VITEEE Rank',
    eligibility_criteria = 'Passed Class 12 with min 60% aggregate in PCM/PCB (50% for SC/ST and specified categories). Mandatory VITEEE score.',
    admission_source_name = 'Vellore Institute of Technology Official Portal',
    admission_source_url = 'https://vit.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d35'
   OR name = 'Vellore Institute of Technology (VIT)';

-- 1.3 International Institute of Information Technology Hyderabad (IIIT-H Portal)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Main', 'UGEE'],
    admission_route = 'IIIT-H Admission Portal based on JEE Main All India Percentile / UGEE / SPEC / Olympiad / DASA',
    eligibility_criteria = 'Class 12 with Physics, Mathematics, Chemistry. High All-India JEE Main percentile or UGEE qualification. Direct application to IIIT-H portal.',
    admission_source_name = 'IIIT Hyderabad Undergraduate Admissions Portal',
    admission_source_url = 'https://ugadmissions.iiit.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d36'
   OR name = 'International Institute of Information Technology Hyderabad (IIIT-H)';

-- 1.4 Delhi Technological University (JAC Delhi Counselling based on JEE Main CRL)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Main'],
    admission_route = 'Joint Admission Counselling (JAC Delhi) based on JEE Main Common Rank List (CRL)',
    eligibility_criteria = 'Passed 10+2 with min 60% aggregate in PCM (50% for reserved). 85% Delhi Region / 15% Outside Delhi Region Quota.',
    admission_source_name = 'JAC Delhi / Delhi Technological University',
    admission_source_url = 'https://jacdelhi.admissions.nic.in / https://www.dtu.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d37'
   OR name = 'Delhi Technological University (DTU)';

-- 1.5 RV College of Engineering (KEA KCET 45% / COMEDK UGET 30% / Management 25%)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['KCET', 'COMEDK UGET'],
    admission_route = 'Karnataka Examination Authority (KCET 45%) / COMEDK UGET (30%) / Management Quota (25%)',
    eligibility_criteria = 'Passed 10+2 with Physics and Mathematics with min 45% aggregate in PCM (40% for Karnataka SC/ST).',
    admission_source_name = 'RV College of Engineering / KEA / COMEDK',
    admission_source_url = 'https://www.rvce.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d38'
   OR name = 'RV College of Engineering';

-- ==============================================================================
-- 2. Correct Special Institutions in public.colleges
-- ==============================================================================

-- 2.1 COEP Technological University (80% State MHT-CET / 20% All India JEE Main Paper 1)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MHT-CET', 'JEE Main'],
    admission_route = 'Maharashtra State CET Cell CAP (80% Maharashtra State Quota / 20% All India Quota)',
    eligibility_criteria = 'Passed 10+2 with Physics & Mathematics compulsory + Chemistry/Bio/Tech Voc with min 45% marks (40% for MH reserved categories). Valid MHT-CET score (State) or JEE Main Paper 1 (All India).',
    admission_source_name = 'COEP Technological University / State Common Entrance Test Cell, Maharashtra',
    admission_source_url = 'https://www.coeptech.ac.in / https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d32'
   OR name = 'COEP Technological University';

-- 2.2 Army Institute of Technology (AIT Pune) - Exclusively JEE Main AIR via AWES
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Main'],
    admission_route = 'AWES Centralized Admission based strictly on JEE Main All India Rank (AIR)',
    eligibility_criteria = 'Children of eligible serving/retired Army personnel (min 10 yrs service). Passed 10+2 with Physics & Math + Chem/Bio/CS with min 45-50%. Valid JEE Main AIR.',
    admission_source_name = 'Army Institute of Technology Official Portal',
    admission_source_url = 'https://www.aitpune.com',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0002-00000000000b'
   OR name = 'Army Institute of Technology';

-- 2.3 Symbiosis Law School Pune (SLS) - Exclusively SLAT + PI/WAT
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['SLAT'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SLAT + PI-WAT',
    eligibility_criteria = 'Passed Standard XII (10+2) with min 45% marks (40% for SC/ST). 50% SLAT score weightage + 50% PI-WAT.',
    admission_source_name = 'Symbiosis Law School Pune Official Portal',
    admission_source_url = 'https://www.symlaw.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000023'
   OR name = 'Symbiosis Law School Pune';

-- 2.4 Bharati Vidyapeeth New Law College Pune - Exclusively BVP CET Law
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['BVP CET'],
    admission_route = 'Bharati Vidyapeeth (Deemed to be University) All-India Admission via BVP CET (Law)',
    eligibility_criteria = 'Passed 10+2 with min 45% marks (40% for SC/ST). Qualified BVP CET Law entrance examination.',
    admission_source_name = 'Bharati Vidyapeeth Deemed University Official Admission Portal',
    admission_source_url = 'https://nlc.bharatividyapeeth.edu',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000024'
   OR name = 'Bharati Vidyapeeth New Law College';

-- 2.5 Architecture Institutions: BKPS & Sinhgad Architecture (NATA / JEE Main Paper 2)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['NATA', 'JEE Main Paper 2'],
    admission_route = 'Maharashtra State CET Cell Centralized Admission Process (CAP) for Architecture',
    eligibility_criteria = 'Passed 10+2 with Physics and Mathematics with min 50% aggregate marks (45% for MH reserved). Valid NATA score (out of 200) or JEE Main Paper 2.',
    admission_source_name = 'Council of Architecture / State Common Entrance Test Cell, Maharashtra',
    admission_source_url = 'https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE id IN ('00000000-0000-0000-0003-00000000002e', '00000000-0000-0000-0003-00000000002f')
   OR name IN ('BKPS Architecture', 'Sinhgad Architecture');

-- 2.6 Law Institutions: ILS Law College & DES Shri Navalmal Firodia Law College (MH CET Law)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MH CET Law'],
    admission_route = 'Maharashtra State CET Cell Centralized Admission Process (CAP) for Law',
    eligibility_criteria = 'Passed 10+2 with min 45% marks (40% for SC/ST MH candidates). Valid MH CET Law score (out of 150).',
    admission_source_name = 'State Common Entrance Test Cell, Maharashtra',
    admission_source_url = 'https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE id IN ('00000000-0000-0000-0003-000000000022', '00000000-0000-0000-0003-000000000025')
   OR name IN ('ILS Law College', 'DES Navalmal Firodia Law College');

-- 2.7 IIT Bombay - JEE (Advanced) AIR via JoSAA
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['JEE Advanced'],
    admission_route = 'Joint Seat Allocation Authority (JoSAA) / CSAB based on JEE (Advanced) CRL/AIR',
    eligibility_criteria = 'Qualified JEE (Advanced). Passed Class 12 with top 20 percentile in respective board or min 75% aggregate (65% for SC/ST/PwD).',
    admission_source_name = 'JoSAA / JEE (Advanced) Apex Board / IIT Bombay Academic Office',
    admission_source_url = 'https://josaa.nic.in / https://acad.iitb.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d33'
   OR name = 'Indian Institute of Technology Bombay (IIT Bombay)';

-- ==============================================================================
-- 3. Verified Pune Private Universities & Autonomous General Colleges in public.colleges
-- ==============================================================================

-- 3.1 Dr. Vishwanath Karad MIT World Peace University (MIT-WPU)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MIT-WPU CET', 'JEE Main', 'MHT-CET', 'PERA CET'],
    admission_route = 'MIT-WPU Institutional Admission via MIT-WPU CET / JEE Main / MHT-CET / PERA CET',
    eligibility_criteria = 'Passed 10+2 with min 50% aggregate in PCM/relevant subjects (45% for reserved). Direct application to MIT-WPU.',
    admission_source_name = 'Dr. Vishwanath Karad MIT World Peace University Admission Portal',
    admission_source_url = 'https://mitwpu.edu.in/admissions',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0002-000000000005'
   OR name = 'MIT WPU';

-- 3.2 MIT Art, Design and Technology University (MIT ADT)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['PERA CET', 'JEE Main', 'MHT-CET'],
    admission_route = 'MIT ADT University Admission via PERA CET / JEE Main / MHT-CET / Uni-GAUGE',
    eligibility_criteria = 'Passed 10+2 with min 50% aggregate (45% for reserved). Direct application to MIT ADT.',
    admission_source_name = 'MIT Art, Design and Technology University Portal',
    admission_source_url = 'https://mituniversity.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0000-00636f6c2d31'
   OR name = 'MIT ADT University';

-- 3.3 Ajeenkya DY Patil University (ADYPU)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['ACET'],
    admission_route = 'ADYPU Institutional Admission based on ACET (ADYPU Common Entrance Test)',
    eligibility_criteria = 'Passed 10+2 with min 45% aggregate (40% for reserved). Qualified ACET.',
    admission_source_name = 'Ajeenkya DY Patil University Portal',
    admission_source_url = 'https://adypu.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000030'
   OR name = 'Ajeenkya DY Patil University';

-- 3.4 FLAME University
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['FEAT', 'SAT', 'ACT'],
    admission_route = 'FLAME University Holistic Admission based on FEAT / SAT / ACT + Essay + Interview',
    eligibility_criteria = 'Passed 10+2 with min 40% aggregate. Valid FEAT/SAT/ACT + Statement of Purpose + PI.',
    admission_source_name = 'FLAME University Admission Portal',
    admission_source_url = 'https://www.flame.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000031'
   OR name = 'Flame University';

-- 3.5 Christ University Pune Lavasa Campus
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['CUET'],
    admission_route = 'Christ University Centralized Admission via CUET / Micro Presentation & Interview',
    eligibility_criteria = 'Passed 10+2 in any stream. Qualified CUET + Micro Presentation & Personal Interview.',
    admission_source_name = 'Christ (Deemed to be University) Portal',
    admission_source_url = 'https://lavasa.christuniversity.in / https://christuniversity.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000032'
   OR name = 'Christ University Pune Lavasa';

-- 3.6 Symbiosis Institute of Computer Studies and Research (SICSR)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['SET'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SET + Personal Interaction',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks (45% for SC/ST).',
    admission_source_name = 'SICSR Official Portal / Symbiosis Entrance Test',
    admission_source_url = 'https://www.sicsr.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000027'
   OR name = 'Symbiosis Institute of Computer Studies';

-- 3.7 Symbiosis Institute of Design (SID)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['SEED'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SEED + PRPI',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks (45% for SC/ST). SEED + Portfolio Review & PI.',
    admission_source_name = 'Symbiosis Institute of Design Portal',
    admission_source_url = 'https://www.sid.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-00000000002d'
   OR name = 'Symbiosis Institute of Design';

-- 3.8 MIT Institute of Design (MIT ID)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MIT DAT'],
    admission_route = 'MIT ID Admission via MIT Design Aptitude Test (DAT) + Studio Test & Interview',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks. Qualified MIT DAT + Studio Test & Interview.',
    admission_source_name = 'MIT Institute of Design Official Portal',
    admission_source_url = 'https://mitid.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-00000000002c'
   OR name = 'MIT Institute of Design';

-- 3.9 Poona College of Pharmacy (Bharati Vidyapeeth Deemed Univ)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['BVP CET', 'NEET', 'MHT-CET'],
    admission_route = 'Bharati Vidyapeeth (Deemed University) All-India Admission via BVP CET (Pharmacy) / NEET / MHT-CET',
    eligibility_criteria = 'Passed 10+2 with Physics & Chemistry as compulsory + Math/Bio with min 45% marks (40% for reserved).',
    admission_source_name = 'Poona College of Pharmacy / Bharati Vidyapeeth',
    admission_source_url = 'https://pcp.bharatividyapeeth.edu',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-00000000002a'
   OR name = 'Poona College of Pharmacy';

-- 3.10 Dr. D.Y. Patil College of Pharmacy (CAP Pharmacy)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['MHT-CET', 'NEET'],
    admission_route = 'Maharashtra State CET Cell Centralized Admission Process (CAP) for Pharmacy',
    eligibility_criteria = 'Passed 10+2 with Physics and Chemistry compulsory + Math/Bio with min 45% (40% for MH reserved). Valid MHT-CET or NEET.',
    admission_source_name = 'State Common Entrance Test Cell, Maharashtra / DY Patil Pharmacy Portal',
    admission_source_url = 'https://pharmacy.dypvp.edu.in / https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-00000000002b'
   OR name = 'DY Patil Pharmacy';

-- 3.11 Fergusson College & Fergusson BCA (10+2 Qualifying Board Merit)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://www.fergusson.edu',
    admission_verification_status = 'VERIFIED'
WHERE id IN ('00000000-0000-0000-0003-00000000001f', '00000000-0000-0000-0003-000000000029')
   OR name IN ('Fergusson College', 'Fergusson BCA');

-- 3.12 Brihan Maharashtra College of Commerce (BMCC)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://www.bmcc.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000020'
   OR name = 'BMCC';

-- 3.13 Modern College & Modern College BCA (10+2 Qualifying Board Merit)
-- STRICT DISAMBIGUATION: Explicitly excludes PES Modern COE (Engineering)
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://moderncollegepune.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE (id IN ('00000000-0000-0000-0003-000000000021', '00000000-0000-0000-0003-000000000028')
   OR name IN ('Modern College', 'Modern College BCA'))
  AND name <> 'PES Modern COE';

-- 3.14 ISB&M Pune
UPDATE public.colleges
SET 
    accepted_exams = ARRAY['ISB&M Written Test'],
    admission_route = 'ISB&M Institutional Admission based on 10+2 Merit + Written Competency Test & Interview',
    eligibility_criteria = 'Passed 10+2 in any discipline with min 50% marks. Written Test + GD/PI.',
    admission_source_name = 'ISB&M Pune Official Portal',
    admission_source_url = 'https://www.isbm.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE id = '00000000-0000-0000-0003-000000000026'
   OR name = 'ISB&M Pune';

-- ==============================================================================
-- 4. PROGRAM-LEVEL VERIFIED UPDATES (public.college_courses)
-- DO NOT PROPAGATE BLANKET COLLEGE METADATA TO ALL PROGRAMS.
-- Only update the exact 57 programs that have explicit prospectus/portal verification.
-- All other 167 programs remain DERIVED or INVALID in accordance with the audit.
-- ==============================================================================

-- 4.1 Reset/Sanitize programs where college-level status is VERIFIED but
-- program cutoffs/details are DERIVED from statutory frameworks (COEP, Arch, Law)
UPDATE public.college_courses
SET admission_verification_status = 'DERIVED'
WHERE college_id IN (
    '00000000-0000-0000-0000-00636f6c2d32', -- COEP Technological University (5 programs)
    '00000000-0000-0000-0003-00000000002e', -- BKPS Architecture (1 program)
    '00000000-0000-0000-0003-00000000002f', -- Sinhgad Architecture (1 program)
    '00000000-0000-0000-0003-000000000022', -- ILS Law College (3 programs)
    '00000000-0000-0000-0003-000000000025'  -- DES Navalmal Firodia Law College (3 programs)
);

-- 4.2 Reset/Sanitize programs where legacy cutoffs are INVALID (AIT Pune, SLS Pune, BVP Law)
UPDATE public.college_courses
SET admission_verification_status = 'INVALID'
WHERE college_id IN (
    '00000000-0000-0000-0002-00000000000b', -- Army Institute of Technology (5 programs)
    '00000000-0000-0000-0003-000000000023', -- Symbiosis Law School Pune (3 programs)
    '00000000-0000-0000-0003-000000000024'  -- Bharati Vidyapeeth New Law College (3 programs)
);

-- 4.3 Populate the EXACT 57 Explicitly Verified Programs

-- 4.3.1 IIT Bombay (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['JEE Advanced'],
    admission_route = 'Joint Seat Allocation Authority (JoSAA) / CSAB based on JEE (Advanced) CRL/AIR',
    eligibility_criteria = 'Qualified JEE (Advanced). Passed Class 12 with top 20 percentile in respective board or min 75% aggregate (65% for SC/ST/PwD).',
    admission_source_name = 'JoSAA / JEE (Advanced) Apex Board / IIT Bombay Academic Office',
    admission_source_url = 'https://josaa.nic.in / https://acad.iitb.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d33'
  AND course_name = 'Computer Science & Engineering';

-- 4.3.2 BITS Pilani (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['BITSAT'],
    admission_route = 'BITS Pilani All-India Admission based on BITSAT Score (out of 390) / Board Toppers Direct',
    eligibility_criteria = 'Passed 12th examination with Physics, Chemistry, and Mathematics (PCM) with min 75% aggregate in PCM, and min 60% in each individual subject.',
    admission_source_name = 'Birla Institute of Technology and Science Admission Portal',
    admission_source_url = 'https://www.bitsadmission.com',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d34'
  AND course_name = 'Computer Science & Engineering';

-- 4.3.3 Vellore Institute of Technology (VIT) (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['VITEEE'],
    admission_route = 'VIT All-India Online Admission based on VITEEE Rank',
    eligibility_criteria = 'Passed Class 12 with min 60% aggregate in PCM/PCB (50% for SC/ST and specified categories). Mandatory VITEEE score.',
    admission_source_name = 'Vellore Institute of Technology Official Portal',
    admission_source_url = 'https://vit.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d35'
  AND course_name = 'Information Technology';

-- 4.3.4 IIIT Hyderabad (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['JEE Main', 'UGEE'],
    admission_route = 'IIIT-H Admission Portal based on JEE Main All India Percentile / UGEE / SPEC / Olympiad / DASA',
    eligibility_criteria = 'Class 12 with Physics, Mathematics, Chemistry. High All-India JEE Main percentile or UGEE qualification. Direct application to IIIT-H portal.',
    admission_source_name = 'IIIT Hyderabad Undergraduate Admissions Portal',
    admission_source_url = 'https://ugadmissions.iiit.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d36'
  AND course_name = 'Artificial Intelligence & Data Science';

-- 4.3.5 Delhi Technological University (DTU) (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['JEE Main'],
    admission_route = 'Joint Admission Counselling (JAC Delhi) based on JEE Main Common Rank List (CRL)',
    eligibility_criteria = 'Passed 10+2 with min 60% aggregate in PCM (50% for reserved). 85% Delhi Region / 15% Outside Delhi Region Quota.',
    admission_source_name = 'JAC Delhi / Delhi Technological University',
    admission_source_url = 'https://jacdelhi.admissions.nic.in / https://www.dtu.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d37'
  AND course_name = 'Software Engineering';

-- 4.3.6 RV College of Engineering (1 program)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['KCET', 'COMEDK UGET'],
    admission_route = 'Karnataka Examination Authority (KCET 45%) / COMEDK UGET (30%) / Management Quota (25%)',
    eligibility_criteria = 'Passed 10+2 with Physics and Mathematics with min 45% aggregate in PCM (40% for Karnataka SC/ST).',
    admission_source_name = 'RV College of Engineering / KEA / COMEDK',
    admission_source_url = 'https://www.rvce.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d38'
  AND course_name = 'Computer Science & Engineering';

-- 4.3.7 MIT World Peace University (MIT-WPU) (5 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['MIT-WPU CET', 'JEE Main', 'MHT-CET', 'PERA CET'],
    admission_route = 'MIT-WPU Institutional Admission via MIT-WPU CET / JEE Main / MHT-CET / PERA CET',
    eligibility_criteria = 'Passed 10+2 with min 50% aggregate in PCM/relevant subjects (45% for reserved). Direct application to MIT-WPU.',
    admission_source_name = 'Dr. Vishwanath Karad MIT World Peace University Admission Portal',
    admission_source_url = 'https://mitwpu.edu.in/admissions',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0002-000000000005'
  AND course_name IN ('B.Tech CSE', 'BBA', 'BCA', 'BA LLB', 'B.Des');

-- 4.3.8 MIT Art, Design and Technology University (MIT ADT) (5 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['PERA CET', 'JEE Main', 'MHT-CET'],
    admission_route = 'MIT ADT University Admission via PERA CET / JEE Main / MHT-CET / Uni-GAUGE',
    eligibility_criteria = 'Passed 10+2 with min 50% aggregate (45% for reserved). Direct application to MIT ADT.',
    admission_source_name = 'MIT Art, Design and Technology University Portal',
    admission_source_url = 'https://mituniversity.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0000-00636f6c2d31'
  AND course_name IN ('B.Tech CSE', 'BBA', 'BCA', 'BA LLB', 'B.Des');

-- 4.3.9 Ajeenkya DY Patil University (ADYPU) (5 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['ACET'],
    admission_route = 'ADYPU Institutional Admission based on ACET (ADYPU Common Entrance Test)',
    eligibility_criteria = 'Passed 10+2 with min 45% aggregate (40% for reserved). Qualified ACET.',
    admission_source_name = 'Ajeenkya DY Patil University Portal',
    admission_source_url = 'https://adypu.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000030'
  AND course_name IN ('B.Tech CSE', 'BBA', 'BCA', 'BA LLB', 'B.Des');

-- 4.3.10 FLAME University (5 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['FEAT', 'SAT', 'ACT'],
    admission_route = 'FLAME University Holistic Admission based on FEAT / SAT / ACT + Essay + Interview',
    eligibility_criteria = 'Passed 10+2 with min 40% aggregate. Valid FEAT/SAT/ACT + Statement of Purpose + PI.',
    admission_source_name = 'FLAME University Admission Portal',
    admission_source_url = 'https://www.flame.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000031'
  AND course_name IN ('B.Tech CSE', 'BBA', 'BCA', 'BA LLB', 'B.Des');

-- 4.3.11 Christ University Pune Lavasa (5 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['CUET'],
    admission_route = 'Christ University Centralized Admission via CUET / Micro Presentation & Interview',
    eligibility_criteria = 'Passed 10+2 in any stream. Qualified CUET + Micro Presentation & Personal Interview.',
    admission_source_name = 'Christ (Deemed to be University) Portal',
    admission_source_url = 'https://lavasa.christuniversity.in / https://christuniversity.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000032'
  AND course_name IN ('B.Tech CSE', 'BBA', 'BCA', 'BA LLB', 'B.Des');

-- 4.3.12 Fergusson College (4 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://www.fergusson.edu',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-00000000001f'
  AND course_name IN ('B.Sc Computer Science', 'B.Sc Biotechnology', 'BA Psychology', 'BA English');

-- 4.3.13 BMCC (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://www.bmcc.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000020'
  AND course_name IN ('B.Com', 'B.Com (Hons)');

-- 4.3.14 Modern College (4 programs)
-- Strictly targets Modern College (Science/Arts), never PES Modern COE
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://moderncollegepune.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000021'
  AND course_name IN ('B.Sc Computer Science', 'B.Sc Biotechnology', 'BA Psychology', 'BA English');

-- 4.3.15 Modern College BCA (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://moderncollegepune.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000028'
  AND course_name IN ('BCA', 'MCA');

-- 4.3.16 Fergusson BCA (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['10+2 Qualifying Board Merit'],
    admission_route = 'Autonomous College / SPPU Merit List Admission based on 10+2 Qualifying Marks',
    eligibility_criteria = 'Passed 10+2 (HSC) in Science / Arts / Commerce with qualifying percentage prescribed by SPPU / Autonomous College.',
    admission_source_name = 'Autonomous College Official Portal / Savitribai Phule Pune University',
    admission_source_url = 'https://www.fergusson.edu',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000029'
  AND course_name IN ('BCA', 'MCA');

-- 4.3.17 ISB&M Pune (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['ISB&M Written Test'],
    admission_route = 'ISB&M Institutional Admission based on 10+2 Merit + Written Competency Test & Interview',
    eligibility_criteria = 'Passed 10+2 in any discipline with min 50% marks. Written Test + GD/PI.',
    admission_source_name = 'ISB&M Pune Official Portal',
    admission_source_url = 'https://www.isbm.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000026'
  AND course_name IN ('BBA', 'MBA');

-- 4.3.18 Symbiosis Institute of Computer Studies and Research (SICSR) (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['SET'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SET + Personal Interaction',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks (45% for SC/ST).',
    admission_source_name = 'SICSR Official Portal / Symbiosis Entrance Test',
    admission_source_url = 'https://www.sicsr.ac.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-000000000027'
  AND course_name IN ('BCA', 'MCA');

-- 4.3.19 Poona College of Pharmacy (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['BVP CET', 'NEET', 'MHT-CET'],
    admission_route = 'Bharati Vidyapeeth (Deemed University) All-India Admission via BVP CET (Pharmacy) / NEET / MHT-CET',
    eligibility_criteria = 'Passed 10+2 with Physics & Chemistry as compulsory + Math/Bio with min 45% marks (40% for reserved).',
    admission_source_name = 'Poona College of Pharmacy / Bharati Vidyapeeth',
    admission_source_url = 'https://pcp.bharatividyapeeth.edu',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-00000000002a'
  AND course_name IN ('B.Pharm', 'D.Pharm');

-- 4.3.20 Dr. D.Y. Patil College of Pharmacy (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['MHT-CET', 'NEET'],
    admission_route = 'Maharashtra State CET Cell Centralized Admission Process (CAP) for Pharmacy',
    eligibility_criteria = 'Passed 10+2 with Physics and Chemistry compulsory + Math/Bio with min 45% (40% for MH reserved). Valid MHT-CET or NEET.',
    admission_source_name = 'State Common Entrance Test Cell, Maharashtra / DY Patil Pharmacy Portal',
    admission_source_url = 'https://pharmacy.dypvp.edu.in / https://cetcell.mahacet.org',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-00000000002b'
  AND course_name IN ('B.Pharm', 'D.Pharm');

-- 4.3.21 MIT Institute of Design (MIT ID) (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['MIT DAT'],
    admission_route = 'MIT ID Admission via MIT Design Aptitude Test (DAT) + Studio Test & Interview',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks. Qualified MIT DAT + Studio Test & Interview.',
    admission_source_name = 'MIT Institute of Design Official Portal',
    admission_source_url = 'https://mitid.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-00000000002c'
  AND course_name IN ('B.Des', 'Fashion Design');

-- 4.3.22 Symbiosis Institute of Design (SID) (2 programs)
UPDATE public.college_courses
SET 
    accepted_exams = ARRAY['SEED'],
    admission_route = 'Symbiosis International (Deemed University) Admission via SEED + PRPI',
    eligibility_criteria = 'Passed 10+2 in any stream with min 50% marks (45% for SC/ST). SEED + Portfolio Review & PI.',
    admission_source_name = 'Symbiosis Institute of Design Portal',
    admission_source_url = 'https://www.sid.edu.in',
    admission_verification_status = 'VERIFIED'
WHERE college_id = '00000000-0000-0000-0003-00000000002d'
  AND course_name IN ('B.Des', 'Fashion Design');

-- ==============================================================================
-- 5. Verification Constraints: Assert Immutability and Audit Compliance
-- ==============================================================================

-- 5.1 Assert exactly 11 INVALID cutoffs remain INVALID
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count 
    FROM public.college_cutoffs 
    WHERE verification_status = 'INVALID';

    IF invalid_count <> 11 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 11 INVALID cutoff records, found %', invalid_count;
    END IF;
END $$;

-- 5.2 Assert exactly 143 DERIVED cutoffs remain DERIVED
DO $$
DECLARE
    derived_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO derived_count 
    FROM public.college_cutoffs 
    WHERE verification_status = 'DERIVED';

    IF derived_count <> 143 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 143 DERIVED cutoff records, found %', derived_count;
    END IF;
END $$;

-- 5.3 Assert no cutoff has assumed year or assumed round
DO $$
DECLARE
    assumed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO assumed_count 
    FROM public.college_cutoffs 
    WHERE year IS NOT NULL OR round IS NOT NULL;

    IF assumed_count > 0 THEN
        RAISE EXCEPTION 'Audit Violation: Found % cutoffs with non-null year/round. All historical cutoffs must preserve NULL year/round.', assumed_count;
    END IF;
END $$;

-- 5.4 Assert exactly 57 courses in public.college_courses have admission_verification_status = 'VERIFIED'
DO $$
DECLARE
    verified_courses_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO verified_courses_count
    FROM public.college_courses
    WHERE admission_verification_status = 'VERIFIED';

    IF verified_courses_count <> 57 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 57 VERIFIED course records, found %', verified_courses_count;
    END IF;
END $$;

-- 5.5 Assert exactly 156 courses in public.college_courses have admission_verification_status = 'DERIVED'
DO $$
DECLARE
    derived_courses_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO derived_courses_count
    FROM public.college_courses
    WHERE admission_verification_status = 'DERIVED';

    IF derived_courses_count <> 156 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 156 DERIVED course records, found %', derived_courses_count;
    END IF;
END $$;

-- 5.6 Assert exactly 11 courses in public.college_courses have admission_verification_status = 'INVALID'
DO $$
DECLARE
    invalid_courses_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_courses_count
    FROM public.college_courses
    WHERE admission_verification_status = 'INVALID';

    IF invalid_courses_count <> 11 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 11 INVALID course records, found %', invalid_courses_count;
    END IF;
END $$;

-- 5.7 Assert exactly 30 colleges in public.colleges have admission_verification_status = 'VERIFIED'
DO $$
DECLARE
    verified_colleges_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO verified_colleges_count
    FROM public.colleges
    WHERE admission_verification_status = 'VERIFIED';

    IF verified_colleges_count <> 30 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 30 VERIFIED college records, found %', verified_colleges_count;
    END IF;
END $$;

-- 5.8 Assert exactly 29 colleges in public.colleges have admission_verification_status = 'DERIVED'
DO $$
DECLARE
    derived_colleges_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO derived_colleges_count
    FROM public.colleges
    WHERE admission_verification_status = 'DERIVED';

    IF derived_colleges_count <> 29 THEN
        RAISE EXCEPTION 'Audit Violation: Expected exactly 29 DERIVED college records, found %', derived_colleges_count;
    END IF;
END $$;

-- 5.9 Assert PES Modern COE (Engineering) was NOT corrupted by autonomous 10+2 merit updates
DO $$
DECLARE
    pes_exams TEXT[];
    pes_status TEXT;
BEGIN
    SELECT accepted_exams, admission_verification_status INTO pes_exams, pes_status
    FROM public.colleges
    WHERE id = '00000000-0000-0000-0002-000000000016' OR name = 'PES Modern COE';

    IF '10+2 Qualifying Board Merit' = ANY(pes_exams) THEN
        RAISE EXCEPTION 'Audit Violation: PES Modern COE was erroneously updated with 10+2 Qualifying Board Merit.';
    END IF;

    IF pes_status <> 'DERIVED' THEN
        RAISE EXCEPTION 'Audit Violation: PES Modern COE status expected DERIVED, found %', pes_status;
    END IF;
END $$;

COMMIT;
