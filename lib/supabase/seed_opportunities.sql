-- ==============================================================================
-- EDUSPHERE AI — PHASE 2, STEP 4B: SEED REAL SUPABASE OPPORTUNITY DATA
-- Idempotent, safe, non-destructive opportunity seed script
-- ==============================================================================

-- 1. Ensure RLS is enabled and public read policies are active
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colleges' AND policyname = 'Allow public read access to colleges') THEN
        CREATE POLICY "Allow public read access to colleges" ON public.colleges FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internships' AND policyname = 'Allow public read access to internships') THEN
        CREATE POLICY "Allow public read access to internships" ON public.internships FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'placements' AND policyname = 'Allow public read access to placements') THEN
        CREATE POLICY "Allow public read access to placements" ON public.placements FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internship_skills' AND policyname = 'Allow public read access to internship_skills') THEN
        CREATE POLICY "Allow public read access to internship_skills" ON public.internship_skills FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'placement_skills' AND policyname = 'Allow public read access to placement_skills') THEN
        CREATE POLICY "Allow public read access to placement_skills" ON public.placement_skills FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Seed 8 Curated Colleges (Idempotent via ON CONFLICT (id) DO NOTHING)
INSERT INTO public.colleges (id, name, location, state, course, fees, avg_package, highest_package, placement_rate, college_type, entrance_exam)
VALUES
  ('00000000-0000-0000-0000-00636f6c2d31', 'MIT ADT University', 'Pune', 'Maharashtra', 'Computer Science & Engineering', 215000, 750000, 2800000, 92, 'private', 'MHT-CET / JEE'),
  ('00000000-0000-0000-0000-00636f6c2d32', 'College of Engineering Pune (COEP)', 'Pune', 'Maharashtra', 'Computer Engineering', 135000, 1120000, 3900000, 96, 'government', 'MHT-CET'),
  ('00000000-0000-0000-0000-00636f6c2d33', 'Indian Institute of Technology Bombay (IIT Bombay)', 'Mumbai', 'Maharashtra', 'Computer Science & Engineering', 230000, 2180000, 16800000, 98, 'government', 'JEE Advanced'),
  ('00000000-0000-0000-0000-00636f6c2d34', 'Birla Institute of Technology and Science (BITS Pilani)', 'Pilani', 'Rajasthan', 'Computer Science & Engineering', 495000, 1850000, 6000000, 95, 'private', 'BITSAT'),
  ('00000000-0000-0000-0000-00636f6c2d35', 'Vellore Institute of Technology (VIT)', 'Vellore', 'Tamil Nadu', 'Information Technology', 198000, 900000, 4400000, 90, 'private', 'VITEEE'),
  ('00000000-0000-0000-0000-00636f6c2d36', 'International Institute of Information Technology Hyderabad (IIIT-H)', 'Hyderabad', 'Telangana', 'Artificial Intelligence & Data Science', 360000, 2400000, 7400000, 97, 'private', 'JEE Main'),
  ('00000000-0000-0000-0000-00636f6c2d37', 'Delhi Technological University (DTU)', 'New Delhi', 'Delhi NCR', 'Software Engineering', 165000, 1540000, 5100000, 93, 'government', 'JEE Main'),
  ('00000000-0000-0000-0000-00636f6c2d38', 'RV College of Engineering', 'Bangalore', 'Karnataka', 'Computer Science & Engineering', 220000, 1200000, 4200000, 94, 'private', 'KCET / COMEDK')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 6 Curated Internships (Idempotent via ON CONFLICT (id) DO NOTHING)
INSERT INTO public.internships (id, company, role, location, remote, stipend, duration)
VALUES
  ('00000000-0000-0000-0000-00696e742d31', 'TechSphere Cloud Labs', 'Frontend Developer', 'Remote', true, 25000, '3 Months'),
  ('00000000-0000-0000-0000-00696e742d32', 'Nexa Innovations', 'Full Stack Engineering Intern', 'Bangalore, Karnataka', false, 30000, '6 Months'),
  ('00000000-0000-0000-0000-00696e742d33', 'DeepMind Labs India', 'AI / Machine Learning Research Intern', 'Pune, Maharashtra', true, 40000, '6 Months'),
  ('00000000-0000-0000-0000-00696e742d34', 'MetricFlow Analytics', 'Data Analyst Intern', 'Mumbai, Maharashtra', false, 20000, '3 Months'),
  ('00000000-0000-0000-0000-00696e742d35', 'CloudScale Systems', 'Cloud & DevOps Engineering Intern', 'Hyderabad, Telangana', true, 28000, '4 Months'),
  ('00000000-0000-0000-0000-00696e742d36', 'PixelCraft Studio', 'UI/UX Design & Frontend Intern', 'Delhi NCR', true, 22000, '3 Months')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Internship Skills (Idempotent via ON CONFLICT DO NOTHING)
-- First ensure unique index on (internship_id, skill_name) if not present
CREATE UNIQUE INDEX IF NOT EXISTS idx_internship_skills_unique ON public.internship_skills (internship_id, skill_name);

INSERT INTO public.internship_skills (id, internship_id, skill_name)
VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-00696e742d31', 'React'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-00696e742d31', 'TypeScript'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-00696e742d31', 'JavaScript'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-00696e742d31', 'Next.js'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-00696e742d31', 'Tailwind CSS'),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-00696e742d32', 'Node.js'),
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-00696e742d32', 'React'),
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-00696e742d32', 'SQL'),
  ('00000000-0000-0000-0001-000000000009', '00000000-0000-0000-0000-00696e742d32', 'Git'),
  ('00000000-0000-0000-0001-00000000000a', '00000000-0000-0000-0000-00696e742d32', 'JavaScript'),
  ('00000000-0000-0000-0001-00000000000b', '00000000-0000-0000-0000-00696e742d33', 'Python'),
  ('00000000-0000-0000-0001-00000000000c', '00000000-0000-0000-0000-00696e742d33', 'Machine Learning'),
  ('00000000-0000-0000-0001-00000000000d', '00000000-0000-0000-0000-00696e742d33', 'Data Structures'),
  ('00000000-0000-0000-0001-00000000000e', '00000000-0000-0000-0000-00696e742d33', 'Docker'),
  ('00000000-0000-0000-0001-00000000000f', '00000000-0000-0000-0000-00696e742d34', 'Python'),
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-00696e742d34', 'SQL'),
  ('00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-00696e742d34', 'Cloud Computing'),
  ('00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0000-00696e742d34', 'Git'),
  ('00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-00696e742d35', 'Docker'),
  ('00000000-0000-0000-0001-000000000014', '00000000-0000-0000-0000-00696e742d35', 'Cloud Computing'),
  ('00000000-0000-0000-0001-000000000015', '00000000-0000-0000-0000-00696e742d35', 'Git'),
  ('00000000-0000-0000-0001-000000000016', '00000000-0000-0000-0000-00696e742d35', 'Python'),
  ('00000000-0000-0000-0001-000000000017', '00000000-0000-0000-0000-00696e742d36', 'Figma'),
  ('00000000-0000-0000-0001-000000000018', '00000000-0000-0000-0000-00696e742d36', 'React'),
  ('00000000-0000-0000-0001-000000000019', '00000000-0000-0000-0000-00696e742d36', 'JavaScript'),
  ('00000000-0000-0000-0001-00000000001a', '00000000-0000-0000-0000-00696e742d36', 'Tailwind CSS')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed 6 Curated Placements (Idempotent via ON CONFLICT (id) DO NOTHING)
INSERT INTO public.placements (id, company, role, industry, min_cgpa, location)
VALUES
  ('00000000-0000-0000-0000-00706c632d31', 'Apex Enterprise Systems', 'Software Engineer', 'Technology & FinTech', 7.5, 'Pune & Bangalore'),
  ('00000000-0000-0000-0000-00706c632d32', 'HyperScale Networks', 'Associate Cloud Architect', 'Cloud Infrastructure', 7, 'Hyderabad, Telangana'),
  ('00000000-0000-0000-0000-00706c632d33', 'Cognita AI', 'AI Systems Engineer', 'Artificial Intelligence', 8, 'Bangalore, Karnataka'),
  ('00000000-0000-0000-0000-00706c632d34', 'FinVantage Global', 'Full Stack Product Engineer', 'Banking & Financial Services', 6.5, 'Mumbai, Maharashtra'),
  ('00000000-0000-0000-0000-00706c632d35', 'Vector Dynamics', 'Core Systems Engineer', 'Automotive & Embedded IoT', 7, 'Chennai, Tamil Nadu'),
  ('00000000-0000-0000-0000-00706c632d36', 'KPMG Analytics', 'Data & Analytics Consultant', 'Consulting & Professional Services', 6, 'Gurgaon, Delhi NCR')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Placement Skills (Idempotent via ON CONFLICT (id) DO NOTHING)
CREATE UNIQUE INDEX IF NOT EXISTS idx_placement_skills_unique ON public.placement_skills (placement_id, skill_name);

INSERT INTO public.placement_skills (id, placement_id, skill_name)
VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-00706c632d31', 'Java'),
  ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-00706c632d31', 'Python'),
  ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-00706c632d31', 'SQL'),
  ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-00706c632d31', 'Data Structures'),
  ('00000000-0000-0000-0002-000000000005', '00000000-0000-0000-0000-00706c632d32', 'Cloud Computing'),
  ('00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0000-00706c632d32', 'Docker'),
  ('00000000-0000-0000-0002-000000000007', '00000000-0000-0000-0000-00706c632d32', 'Git'),
  ('00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0000-00706c632d32', 'Python'),
  ('00000000-0000-0000-0002-000000000009', '00000000-0000-0000-0000-00706c632d33', 'Python'),
  ('00000000-0000-0000-0002-00000000000a', '00000000-0000-0000-0000-00706c632d33', 'Machine Learning'),
  ('00000000-0000-0000-0002-00000000000b', '00000000-0000-0000-0000-00706c632d33', 'Data Structures'),
  ('00000000-0000-0000-0002-00000000000c', '00000000-0000-0000-0000-00706c632d33', 'C++'),
  ('00000000-0000-0000-0002-00000000000d', '00000000-0000-0000-0000-00706c632d34', 'React'),
  ('00000000-0000-0000-0002-00000000000e', '00000000-0000-0000-0000-00706c632d34', 'Node.js'),
  ('00000000-0000-0000-0002-00000000000f', '00000000-0000-0000-0000-00706c632d34', 'TypeScript'),
  ('00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0000-00706c632d34', 'SQL'),
  ('00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0000-00706c632d35', 'C++'),
  ('00000000-0000-0000-0002-000000000012', '00000000-0000-0000-0000-00706c632d35', 'Python'),
  ('00000000-0000-0000-0002-000000000013', '00000000-0000-0000-0000-00706c632d35', 'Data Structures'),
  ('00000000-0000-0000-0002-000000000014', '00000000-0000-0000-0000-00706c632d36', 'SQL'),
  ('00000000-0000-0000-0002-000000000015', '00000000-0000-0000-0000-00706c632d36', 'Python'),
  ('00000000-0000-0000-0002-000000000016', '00000000-0000-0000-0000-00706c632d36', 'Cloud Computing')
ON CONFLICT (id) DO NOTHING;

-- 7. Verification Queries
SELECT 'colleges' as table_name, count(*) as row_count FROM public.colleges
UNION ALL
SELECT 'internships', count(*) FROM public.internships
UNION ALL
SELECT 'placements', count(*) FROM public.placements
UNION ALL
SELECT 'internship_skills', count(*) FROM public.internship_skills
UNION ALL
SELECT 'placement_skills', count(*) FROM public.placement_skills;
