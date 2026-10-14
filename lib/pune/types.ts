/**
 * Row shapes of the pune_* tables. Every column except `id` is text; missing
 * values are the literal "NOT_AVAILABLE" (see lib/pune/format.ts).
 *
 * The child tables are not linked by id: they reference a college through
 * `college_name_as_published` + `district`.
 */

type Text = string | null;

interface SourceColumns {
  source_type: Text;
  source_url: Text;
  evidence_quote: Text;
  retrieved_date: Text;
}

export interface PuneCollege extends SourceColumns {
  id: number;
  college_name_as_published: string;
  short_name: Text;
  district: string;
  city: Text;
  taluka: Text;
  pin_code: Text;
  address_as_published: Text;
  latitude: Text;
  longitude: Text;
  affiliating_university: Text;
  institution_type: Text;
  ownership: Text;
  autonomous_status: Text;
  established_year: Text;
  official_website: Text;
  admission_url: Text;
  email: Text;
  phone: Text;
  aishe_code: Text;
  dte_code: Text;
  dhe_code: Text;
  naac_grade: Text;
  naac_cgpa: Text;
  naac_cycle_year: Text;
  naac_valid_until: Text;
  nirf_rank_latest: Text;
  nirf_year: Text;
}

/** Columns needed for list cards. */
export type PuneCollegeSummary = Pick<
  PuneCollege,
  | "id"
  | "college_name_as_published"
  | "district"
  | "city"
  | "taluka"
  | "affiliating_university"
  | "institution_type"
  | "ownership"
  | "naac_grade"
>;

export const COLLEGE_SUMMARY_COLUMNS =
  "id,college_name_as_published,district,city,taluka,affiliating_university,institution_type,ownership,naac_grade";

export interface PuneProgramme extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  affiliating_university: Text;
  field: Text;
  sub_field: Text;
  degree_level: Text;
  programme_degree: Text;
  programme_name_official: Text;
  specialisation: Text;
  duration_years: Text;
  mode: Text;
  intake_seats: Text;
  academic_year: Text;
  approval_body: Text;
  approval_status: Text;
  admission_route: Text;
  entrance_exam: Text;
  choice_or_course_code: Text;
  official_course_url: Text;
}

export interface PuneFee extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  programme_degree: Text;
  specialisation: Text;
  academic_year: Text;
  tuition_fee_inr: Text;
  development_fee_inr: Text;
  other_compulsory_fee_inr: Text;
  total_annual_fee_inr: Text;
  hostel_fee_inr: Text;
  fee_category: Text;
  fee_authority: Text;
}

export interface PuneAdmission extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  programme_degree: Text;
  specialisation: Text;
  admission_route: Text;
  entrance_exam: Text;
  admission_authority: Text;
  eligibility: Text;
  required_subjects: Text;
  minimum_marks_percent: Text;
  other_eligibility: Text;
  application_url: Text;
  academic_year: Text;
  important_dates: Text;
}

export interface PuneAccreditation extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  programme_degree: Text;
  body: Text;
  record_type: Text;
  approval_identifier: Text;
  status: Text;
  grade: Text;
  valid_from: Text;
  valid_to: Text;
  academic_year: Text;
  scope: Text;
}

export interface PuneCutoff extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  programme_degree: Text;
  specialisation: Text;
  choice_code: Text;
  exam: Text;
  admission_route: Text;
  academic_year: Text;
  round: Text;
  category: Text;
  quota: Text;
  seat_type: Text;
  cutoff_type: Text;
  cutoff_value: Text;
  cutoff_unit: Text;
}

export interface PuneFacility extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  facility_type: Text;
  description: Text;
  capacity: Text;
  academic_year: Text;
}

export interface PuneScholarship extends SourceColumns {
  id: number;
  college_name_as_published: string;
  district: string;
  programme_degree: Text;
  name: Text;
  provider: Text;
  eligibility: Text;
  category: Text;
  benefit: Text;
  academic_year: Text;
  application_url: Text;
}

export interface PuneEntranceExam extends SourceColumns {
  id: number;
  exam_name: Text;
  conducting_authority: Text;
  exam_level: Text;
  used_for_programmes: Text;
  pattern_or_syllabus_url: Text;
  typical_exam_month: Text;
  official_website: Text;
  academic_year: Text;
}

export interface CollegeRelated {
  programmes: PuneProgramme[];
  fees: PuneFee[];
  admissions: PuneAdmission[];
  accreditations: PuneAccreditation[];
  cutoffs: PuneCutoff[];
  facilities: PuneFacility[];
  scholarships: PuneScholarship[];
}
