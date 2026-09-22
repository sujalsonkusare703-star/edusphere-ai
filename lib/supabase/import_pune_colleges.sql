-- ==============================================================================
-- EDUSPHERE AI — 30 PUNE ENGINEERING COLLEGES DATASET IMPORT
-- Deterministic, idempotent, safe migration and seeding script.
-- Preserves existing user profiles, saved items, and other tables.
-- ==============================================================================

-- 1. Ensure public.colleges has data_source column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'colleges' 
          AND column_name = 'data_source'
    ) THEN
        ALTER TABLE public.colleges ADD COLUMN data_source TEXT DEFAULT 'EduSphere imported dataset';
    END IF;
END $$;

-- 2. Create public.college_programs normalized relation
CREATE TABLE IF NOT EXISTS public.college_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_college_program UNIQUE(college_id, program_name)
);

-- Enable RLS and public read policy for college_programs
ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'college_programs' 
          AND policyname = 'Allow public read access to college_programs'
    ) THEN
        CREATE POLICY "Allow public read access to college_programs" 
        ON public.college_programs FOR SELECT USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_college_programs_college_id ON public.college_programs(college_id);
CREATE INDEX IF NOT EXISTS idx_college_programs_program_name ON public.college_programs(program_name);

-- 3. Upsert the 30 Pune Engineering Colleges
INSERT INTO public.colleges (
    id, name, location, state, course, fees, avg_package, highest_package, placement_rate, college_type, entrance_exam, data_source
) VALUES
  ('00000000-0000-0000-0000-00636f6c2d32', 'COEP Technological University', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical, Civil, Electrical', 95000, 1050000, 5200000, 90, 'government', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000002', 'Government College of Engineering Pune', 'Pune', 'Maharashtra', 'CSE, Mechanical, Civil, E&TC', 90000, 880000, 3400000, 85, 'government', 'MHT-CET', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000003', 'Pune Institute of Computer Technology (PICT)', 'Pune', 'Maharashtra', 'CSE, IT, E&TC', 110000, 980000, 4700000, 94, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000004', 'Vishwakarma Institute of Technology', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical, Civil', 195000, 780000, 5100000, 90, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000005', 'MIT World Peace University', 'Pune', 'Maharashtra', 'CSE, AI, Mechanical, Civil', 330000, 650000, 5100000, 85, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000006', 'MIT Academy of Engineering', 'Pune', 'Maharashtra', 'CSE, AI, Robotics, Mechanical', 185000, 620000, 2500000, 82, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000007', 'Pimpri Chinchwad College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Civil, Mechanical', 145000, 600000, 4400000, 88, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000008', 'PCCOE & Research', 'Pune', 'Maharashtra', 'CSE, AI, IT', 150000, 580000, 2200000, 82, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000009', 'DY Patil College of Engineering Akurdi', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 135000, 550000, 2800000, 84, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000a', 'DY Patil Institute of Engineering & Technology', 'Pune', 'Maharashtra', 'CSE, IT, Civil', 125000, 500000, 2000000, 78, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000b', 'Army Institute of Technology', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 170000, 920000, 4800000, 95, 'private', 'JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000c', 'Cummins College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, E&TC', 150000, 700000, 2500000, 88, 'private', 'MHT-CET', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000d', 'AISSMS College of Engineering', 'Pune', 'Maharashtra', 'CSE, Civil, Mechanical', 120000, 500000, 1800000, 80, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000e', 'AISSMS Institute of Information Technology', 'Pune', 'Maharashtra', 'CSE, IT, AI', 140000, 580000, 1900000, 82, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000000f', 'Sinhgad College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Civil', 115000, 480000, 1600000, 75, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000010', 'Sinhgad Academy of Engineering', 'Pune', 'Maharashtra', 'CSE, AI, IT', 110000, 450000, 1500000, 72, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000011', 'Sinhgad Institute of Technology', 'Pune', 'Maharashtra', 'CSE, Civil, Mechanical', 105000, 420000, 1200000, 70, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000012', 'JSPM Rajarshi Shahu College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, E&TC', 125000, 450000, 1500000, 72, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000013', 'JSPM Bhivarabai Sawant Institute', 'Pune', 'Maharashtra', 'CSE, Civil, Mechanical', 115000, 400000, 1100000, 68, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000014', 'MMCOE (Marathwada Mitra Mandal)', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 140000, 520000, 1700000, 80, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000015', 'PVG College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 130000, 540000, 1800000, 82, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000016', 'PES Modern College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Civil', 145000, 560000, 2100000, 83, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000017', 'Indira College of Engineering & Management', 'Pune', 'Maharashtra', 'CSE, AI, IT', 135000, 430000, 1200000, 70, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000018', 'Zeal College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 125000, 410000, 1000000, 68, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-000000000019', 'Dhole Patil College of Engineering', 'Pune', 'Maharashtra', 'CSE, Civil, Mechanical', 120000, 390000, 900000, 65, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000001a', 'Trinity College of Engineering & Research', 'Pune', 'Maharashtra', 'CSE, AI, IT', 120000, 420000, 1100000, 69, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000001b', 'G.H. Raisoni College of Engineering & Management', 'Pune', 'Maharashtra', 'CSE, AI, IT', 140000, 480000, 1600000, 76, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000001c', 'PDEA College of Engineering Manjari', 'Pune', 'Maharashtra', 'CSE, Civil, Mechanical', 115000, 400000, 1000000, 66, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0002-00000000001d', 'Smt. Kashibai Navale College of Engineering', 'Pune', 'Maharashtra', 'CSE, IT, Mechanical', 125000, 440000, 1300000, 71, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset'),
  ('00000000-0000-0000-0000-00636f6c2d31', 'MIT Art, Design & Technology University', 'Pune', 'Maharashtra', 'CSE, AI, Data Science', 250000, 590000, 2300000, 80, 'private', 'MHT-CET / JEE Main', 'EduSphere imported dataset')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    state = EXCLUDED.state,
    course = EXCLUDED.course,
    fees = EXCLUDED.fees,
    avg_package = EXCLUDED.avg_package,
    highest_package = EXCLUDED.highest_package,
    placement_rate = EXCLUDED.placement_rate,
    college_type = EXCLUDED.college_type,
    entrance_exam = EXCLUDED.entrance_exam,
    data_source = EXCLUDED.data_source;

-- 4. Seed normalized programs into public.college_programs
INSERT INTO public.college_programs (college_id, program_name)
VALUES
  ('00000000-0000-0000-0000-00636f6c2d32', 'CSE'),
  ('00000000-0000-0000-0000-00636f6c2d32', 'IT'),
  ('00000000-0000-0000-0000-00636f6c2d32', 'Mechanical'),
  ('00000000-0000-0000-0000-00636f6c2d32', 'Civil'),
  ('00000000-0000-0000-0000-00636f6c2d32', 'Electrical'),
  ('00000000-0000-0000-0002-000000000002', 'CSE'),
  ('00000000-0000-0000-0002-000000000002', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000002', 'Civil'),
  ('00000000-0000-0000-0002-000000000002', 'E&TC'),
  ('00000000-0000-0000-0002-000000000003', 'CSE'),
  ('00000000-0000-0000-0002-000000000003', 'IT'),
  ('00000000-0000-0000-0002-000000000003', 'E&TC'),
  ('00000000-0000-0000-0002-000000000004', 'CSE'),
  ('00000000-0000-0000-0002-000000000004', 'IT'),
  ('00000000-0000-0000-0002-000000000004', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000004', 'Civil'),
  ('00000000-0000-0000-0002-000000000005', 'CSE'),
  ('00000000-0000-0000-0002-000000000005', 'AI'),
  ('00000000-0000-0000-0002-000000000005', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000005', 'Civil'),
  ('00000000-0000-0000-0002-000000000006', 'CSE'),
  ('00000000-0000-0000-0002-000000000006', 'AI'),
  ('00000000-0000-0000-0002-000000000006', 'Robotics'),
  ('00000000-0000-0000-0002-000000000006', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000007', 'CSE'),
  ('00000000-0000-0000-0002-000000000007', 'IT'),
  ('00000000-0000-0000-0002-000000000007', 'Civil'),
  ('00000000-0000-0000-0002-000000000007', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000008', 'CSE'),
  ('00000000-0000-0000-0002-000000000008', 'AI'),
  ('00000000-0000-0000-0002-000000000008', 'IT'),
  ('00000000-0000-0000-0002-000000000009', 'CSE'),
  ('00000000-0000-0000-0002-000000000009', 'IT'),
  ('00000000-0000-0000-0002-000000000009', 'Mechanical'),
  ('00000000-0000-0000-0002-00000000000a', 'CSE'),
  ('00000000-0000-0000-0002-00000000000a', 'IT'),
  ('00000000-0000-0000-0002-00000000000a', 'Civil'),
  ('00000000-0000-0000-0002-00000000000b', 'CSE'),
  ('00000000-0000-0000-0002-00000000000b', 'IT'),
  ('00000000-0000-0000-0002-00000000000b', 'Mechanical'),
  ('00000000-0000-0000-0002-00000000000c', 'CSE'),
  ('00000000-0000-0000-0002-00000000000c', 'IT'),
  ('00000000-0000-0000-0002-00000000000c', 'E&TC'),
  ('00000000-0000-0000-0002-00000000000d', 'CSE'),
  ('00000000-0000-0000-0002-00000000000d', 'Civil'),
  ('00000000-0000-0000-0002-00000000000d', 'Mechanical'),
  ('00000000-0000-0000-0002-00000000000e', 'CSE'),
  ('00000000-0000-0000-0002-00000000000e', 'IT'),
  ('00000000-0000-0000-0002-00000000000e', 'AI'),
  ('00000000-0000-0000-0002-00000000000f', 'CSE'),
  ('00000000-0000-0000-0002-00000000000f', 'IT'),
  ('00000000-0000-0000-0002-00000000000f', 'Civil'),
  ('00000000-0000-0000-0002-000000000010', 'CSE'),
  ('00000000-0000-0000-0002-000000000010', 'AI'),
  ('00000000-0000-0000-0002-000000000010', 'IT'),
  ('00000000-0000-0000-0002-000000000011', 'CSE'),
  ('00000000-0000-0000-0002-000000000011', 'Civil'),
  ('00000000-0000-0000-0002-000000000011', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000012', 'CSE'),
  ('00000000-0000-0000-0002-000000000012', 'IT'),
  ('00000000-0000-0000-0002-000000000012', 'E&TC'),
  ('00000000-0000-0000-0002-000000000013', 'CSE'),
  ('00000000-0000-0000-0002-000000000013', 'Civil'),
  ('00000000-0000-0000-0002-000000000013', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000014', 'CSE'),
  ('00000000-0000-0000-0002-000000000014', 'IT'),
  ('00000000-0000-0000-0002-000000000014', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000015', 'CSE'),
  ('00000000-0000-0000-0002-000000000015', 'IT'),
  ('00000000-0000-0000-0002-000000000015', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000016', 'CSE'),
  ('00000000-0000-0000-0002-000000000016', 'IT'),
  ('00000000-0000-0000-0002-000000000016', 'Civil'),
  ('00000000-0000-0000-0002-000000000017', 'CSE'),
  ('00000000-0000-0000-0002-000000000017', 'AI'),
  ('00000000-0000-0000-0002-000000000017', 'IT'),
  ('00000000-0000-0000-0002-000000000018', 'CSE'),
  ('00000000-0000-0000-0002-000000000018', 'IT'),
  ('00000000-0000-0000-0002-000000000018', 'Mechanical'),
  ('00000000-0000-0000-0002-000000000019', 'CSE'),
  ('00000000-0000-0000-0002-000000000019', 'Civil'),
  ('00000000-0000-0000-0002-000000000019', 'Mechanical'),
  ('00000000-0000-0000-0002-00000000001a', 'CSE'),
  ('00000000-0000-0000-0002-00000000001a', 'AI'),
  ('00000000-0000-0000-0002-00000000001a', 'IT'),
  ('00000000-0000-0000-0002-00000000001b', 'CSE'),
  ('00000000-0000-0000-0002-00000000001b', 'AI'),
  ('00000000-0000-0000-0002-00000000001b', 'IT'),
  ('00000000-0000-0000-0002-00000000001c', 'CSE'),
  ('00000000-0000-0000-0002-00000000001c', 'Civil'),
  ('00000000-0000-0000-0002-00000000001c', 'Mechanical'),
  ('00000000-0000-0000-0002-00000000001d', 'CSE'),
  ('00000000-0000-0000-0002-00000000001d', 'IT'),
  ('00000000-0000-0000-0002-00000000001d', 'Mechanical'),
  ('00000000-0000-0000-0000-00636f6c2d31', 'CSE'),
  ('00000000-0000-0000-0000-00636f6c2d31', 'AI'),
  ('00000000-0000-0000-0000-00636f6c2d31', 'Data Science')
ON CONFLICT (college_id, program_name) DO NOTHING;

-- 5. Verification queries
SELECT count(*) AS total_colleges FROM public.colleges;
SELECT count(*) AS total_pune_colleges FROM public.colleges WHERE location = 'Pune';
SELECT count(*) AS total_programs FROM public.college_programs;
SELECT program_name, count(*) AS college_count FROM public.college_programs GROUP BY program_name ORDER BY college_count DESC;
