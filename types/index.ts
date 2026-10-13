export interface Profile {
  id: string; // references auth.users.id
  full_name: string | null;
  role: string | null; // e.g. 'student'
  created_at?: string;
  updated_at?: string;
}

export interface StudentProfile {
  id: string;
  profile_id: string; // references profiles.id
  preferred_branch: string | null;
  entrance_score: number | null;
  preferred_location: string | null;
  cgpa?: number | null;
  career_goal?: string | null;
  category?: string | null; // e.g. 'OPEN', 'OBC', 'SC', 'ST'
  entrance_exam?: string | null; // e.g. 'MHT CET', 'JEE Main'
  preferred_field?: string | null;
  preferred_degree_level?: string | null;
  preferred_degree?: string | null;
  preferred_district?: string | null;
  preferred_university?: string | null;
  // Profile-page fields stored in auth user_metadata (see lib/profile-store.ts)
  degree_level_code?: string | null;
  field_code?: string | null;
  specialisation?: string | null;
  college_name?: string | null;
  college_district?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StudentSkill {
  id: string;
  student_profile_id: string;
  skill_name: string;
}

export type VerificationStatus =
  | "VERIFIED"
  | "DERIVED"
  | "NOT_VERIFIED"
  | "INVALID"
  | "NOT_APPLICABLE"
  | "PARTIALLY_VERIFIED"
  | "NOT_AVAILABLE";
export type CutoffUnit = "percentile" | "rank" | "score" | "marks" | "marks_out_of_200" | "marks_out_of_150" | "marks_out_of_390" | "other";

export interface CollegeCutoff {
  id?: string;
  course_id: number;
  college_id?: string;
  exam: string;
  open: number | null;
  obc: number | null;
  sc: number | null;
  st: number | null;
  quota?: string;
  year?: number;
  cutoff_unit?: CutoffUnit;
  round?: string;
  cutoff_type?: string;
  source_name?: string;
  source_url?: string;
  verification_status?: VerificationStatus;
  notes?: string;
}

export interface CollegeCourse {
  id?: string;
  course_id: number;
  college_id: string;
  source_college_id?: number;
  stream: string;
  course_name: string;
  intake: number;
  program_url?: string | null;
  jee_cutoff?: string | null;
  accepted_exams?: string[];
  admission_route?: string;
  eligibility_criteria?: string;
  admission_source_name?: string;
  admission_source_url?: string;
  admission_verification_status?: VerificationStatus;
  canonical_program_id?: number | null;
  field?: string | null;
  sub_field?: string | null;
  degree_level?: string | null;
  degree?: string | null;
  duration_years?: string | null;
  mode?: string | null;
  cutoffs?: CollegeCutoff[];
}

export interface College {
  id: string;
  source_id?: number | null;
  name: string;
  short_name?: string | null;
  location: string | null;
  state: string | null;
  course: string | null;
  fees: number | null;
  entrance_exam: string | null;
  placement_rate: number | null;
  avg_package: number | null;
  highest_package: number | null;
  college_type: string | null;
  programs?: string[];
  data_source?: string | null;
  primary_stream?: string | null;
  naac_grade?: string | null;
  official_website?: string | null;
  provenance?: string | null;
  accepted_exams?: string[];
  admission_route?: string;
  eligibility_criteria?: string;
  admission_source_name?: string;
  admission_source_url?: string;
  admission_verification_status?: VerificationStatus;
  courses_count?: number;
  courses?: CollegeCourse[];
  university_id?: number | null;
  university_name?: string | null;
  district?: string | null;
  taluka?: string | null;
  city?: string | null;
  address?: string | null;
  pin_code?: string | null;
  institution_type?: string | null;
  ownership?: string | null;
  established_year?: number | string | null;
  autonomous_status?: string | null;
  admission_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  verification_status?: VerificationStatus | string | null;
  last_verified_at?: string | null;
  academic_year?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SourceType =
  | "OFFICIAL_PORTAL"
  | "ADMISSION_PAGE"
  | "EXAM_AUTHORITY"
  | "NOTIFICATION_CIRCULAR"
  | "FEE_STRUCTURE";

export type ContentFormat = "HTML" | "PDF" | "JSON";

export interface CollegeSourceRegistry {
  id: string;
  college_id: string;
  source_name: string;
  source_url: string;
  source_type: SourceType;
  content_format: ContentFormat;
  selector_config?: Record<string, unknown>;
  check_frequency_days: number;
  last_checked_at?: string | null;
  last_changed_at?: string | null;
  last_content_hash?: string | null;
  consecutive_failures: number;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DetectionStatus =
  | "UNCHANGED"
  | "CHANGED"
  | "FIRST_CHECK"
  | "ERROR"
  | "PENDING_PDF_EXTRACTION"
  | "UNSUPPORTED";

export type SignalLevel = "LOW_SIGNAL" | "MEDIUM_SIGNAL" | "HIGH_SIGNAL";

export interface SourceCheckResult {
  sourceId: string;
  collegeId: string;
  sourceUrl: string;
  sourceType: SourceType;
  contentFormat: ContentFormat;
  status: DetectionStatus;
  httpStatus?: number;
  contentType?: string;
  finalUrl?: string;
  previousHash: string | null;
  currentHash: string | null;
  hashChanged: boolean;
  signalLevel: SignalLevel;
  changeSummary: string;
  detectedKeywords: string[];
  durationMs: number;
  checkedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

export type ChangeEventType =
  | "ADMISSION_ROUTE_UPDATE"
  | "ELIGIBILITY_CRITERIA_UPDATE"
  | "ACCEPTED_EXAMS_UPDATE"
  | "CUTOFF_DATA_RELEASE"
  | "SOURCE_URL_REDIRECT"
  | "NEW_PROGRAM_DISCOVERED";

export type ChangeEventStatus =
  | "DETECTED"
  | "PARSED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED"
  | "ERROR";

export interface CollegeDataChangeEvent {
  id: string;
  source_id: string;
  college_id: string;
  course_id?: number | null;
  event_type: ChangeEventType;
  previous_value?: Record<string, unknown> | null;
  proposed_value: Record<string, unknown>;
  diff_summary?: string | null;
  status: ChangeEventStatus;
  rejection_reason?: string | null;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  applied_at?: string | null;
  raw_payload_snippet?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CollegeProgram {
  id: string;
  college_id: string;
  program_name: string;
  created_at?: string;
}

export interface Internship {
  id: string;
  role: string;
  company: string;
  stipend: string | null;
  duration: string | null;
  location: string | null;
  remote: boolean | null;
  skills?: string[];
}

export interface InternshipSkill {
  id: string;
  internship_id: string;
  skill_name: string;
}

export interface Placement {
  id: string;
  company?: string | null;
  role?: string | null;
  industry?: string | null;
  min_cgpa?: number | null;
  location?: string | null;
  skills?: string[];
  college_id?: string | null;
  program_id?: number | null;
  metric_name?: string | null;
  metric_value?: string | null;
  metric_unit?: string | null;
  placement_year?: string | null;
  recruiters?: string | null;
  internship_details?: string | null;
  avg_package?: number | string | null;
  highest_package?: number | string | null;
  package?: number | string | null;
  verification_status?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  last_verified_at?: string | null;
  notes?: string | null;
}

export interface PlacementSkill {
  id: string;
  placement_id: string;
  skill_name: string;
}

export interface CanonicalSource {
  source_id: number;
  source_name: string;
  name?: string;
  source_type?: string | null;
  organization?: string | null;
  publisher?: string | null;
  url?: string | null;
  publication_year?: number | null;
  retrieved_at?: string | null;
  sha256?: string | null;
  verification_status?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalUniversity {
  university_id: number;
  official_name: string;
  university_type?: string | null;
  ownership?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  official_website?: string | null;
  source_id?: number | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalProgram {
  program_id: number;
  institution_id?: number | null;
  college_id?: string | null;
  field?: string | null;
  sub_field?: string | null;
  stream?: string | null;
  degree_level?: string | null;
  degree?: string | null;
  official_program_name: string;
  specialization?: string | null;
  duration_years?: string | null;
  mode?: string | null;
  intake?: string | null;
  course_url?: string | null;
  academic_year?: string | null;
  source_id?: number | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalAdmission {
  admission_id: number;
  id?: number | string;
  institution_id?: number | null;
  college_id?: string | null;
  program_id?: number | null;
  admission_route?: string | null;
  entrance_exam?: string | null;
  admission_authority?: string | null;
  eligibility?: string | null;
  required_subjects?: string | null;
  minimum_marks?: string | null;
  other_requirements?: string | null;
  application_url?: string | null;
  academic_year?: string | null;
  important_dates?: string | null;
  source_id?: number | null;
  verification_status?: string | null;
  last_verified?: string | null;
  created_at?: string;
}

export interface CanonicalCutoff {
  cutoff_id: number;
  institution_id?: number | null;
  college_id?: string | null;
  program_id?: number | null;
  choice_code?: string | null;
  exam?: string | null;
  admission_route?: string | null;
  academic_year?: string | null;
  round?: string | null;
  category?: string | null;
  quota?: string | null;
  seat_type?: string | null;
  cutoff_type?: string | null;
  cutoff_value?: string | null;
  cutoff_unit?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalFee {
  fee_id: number;
  id?: number | string;
  institution_id?: number | null;
  college_id?: string | null;
  program_id?: number | null;
  academic_year?: string | null;
  tuition_fee?: number | null;
  development_fee?: number | null;
  mandatory_charges?: number | null;
  other_charges?: number | null;
  total_annual_academic_fee?: number | null;
  total_fee?: number | null;
  hostel_fee?: number | null;
  other_compulsory_charges?: number | null;
  fee_category?: string | null;
  quota_or_category?: string | null;
  currency?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalFacility {
  facility_id: number;
  id?: number | string;
  institution_id?: number | null;
  college_id?: string | null;
  facility_type: string;
  description?: string | null;
  capacity?: string | null;
  academic_year?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  verification_status?: string | null;
  verified?: boolean;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalAccreditation {
  accreditation_id: number;
  id?: number | string;
  institution_id?: number | null;
  college_id?: string | null;
  program_id?: number | null;
  body: string;
  record_type?: string | null;
  approval_identifier?: string | null;
  status?: string | null;
  grade?: string | null;
  grade_or_status?: string | null;
  cycle?: string | null;
  cgpa?: string | number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  valid_until?: string | null;
  academic_year?: string | null;
  scope?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CanonicalScholarship {
  scholarship_id: number;
  institution_id?: number | null;
  college_id?: string | null;
  program_id?: number | null;
  name: string;
  provider?: string | null;
  eligibility?: string | null;
  category?: string | null;
  benefit?: string | null;
  academic_year?: string | null;
  application_url?: string | null;
  source_id?: number | null;
  source_url?: string | null;
  verification_status?: string | null;
  last_verified?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface InstitutionSource {
  id: string;
  institution_id?: number | null;
  college_id?: string | null;
  source_id?: number | null;
  source_page?: string | null;
  evidence?: string | null;
  verification_status?: string | null;
  status?: string | null;
  last_verified?: string | null;
  verified_at?: string | null;
  created_at?: string;
  source?: CanonicalSource | null;
}

export interface AdmissionSource {
  admission_source_id: number;
  admission_id: number;
  source_id?: number | null;
  source_url?: string | null;
  evidence?: string | null;
  verification_status?: string | null;
  created_at?: string;
  source?: CanonicalSource | null;
}

export interface VerificationAudit {
  audit_id: number;
  id?: number | string;
  entity_type: string;
  audit_type?: string;
  entity_id: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  source_id?: number | null;
  audit_date?: string | null;
  reviewer?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface SavedItem {
  id: string;
  student_profile_id: string;
  item_type: 'college' | 'internship' | 'placement';
  item_id: string;
  saved_at: string;
  college?: College;
  internship?: Internship;
  placement?: Placement;
}

export interface RecommendationLog {
  id: string;
  student_profile_id: string;
  item_type: 'college' | 'internship' | 'placement';
  item_id: string;
  match_score: number;
  created_at?: string;
}

export interface FactorBreakdown {
  academic_match?: number; // 0-100
  branch_match?: number;   // 0-100
  location_match?: number; // 0-100
  skill_match?: number;    // 0-100
  eligibility_match?: number; // 0-100
  cutoff_match?: number;   // 0-100 (Cutoff compatibility)
  career_match?: number;   // 0-100 (Career/domain alignment)
}

export type CutoffStatus = "Cutoff compatible" | "Cutoff not met" | "Cutoff unavailable";

export interface RecommendationItem {
  id: string;
  item_type: 'college' | 'internship' | 'placement';
  title: string;
  subtitle: string;
  match_score: number;
  match_reasons: string[];
  college?: College;
  internship?: Internship;
  placement?: Placement;
  is_ai_recommended?: boolean;
  factor_breakdown?: FactorBreakdown;
  matching_skills?: string[];
  missing_skills?: string[];
  is_eligible?: boolean;
  eligibility_text?: string;
  relevant_cutoff?: string;
  // Phase 3 Step 2 Cutoff Recommendation Fields
  cutoff_status?: CutoffStatus;
  target_program_name?: string;
  cutoff_exam?: string;
  cutoff_category?: string;
  cutoff_value?: number | null;
  cutoff_unit?: CutoffUnit;
  cutoff_round?: string;
  student_score?: number | null;
  score_difference?: number | null;
  source_attribution?: string;
}

export interface SkillGapItem {
  skill: string;
  frequency: number;
  reason: string;
  demand_level: "High" | "Medium" | "Emerging";
  relevant_roles: string[];
}

export interface SkillGapAnalysis {
  current_skills: string[];
  recommended_skills: SkillGapItem[];
  skill_coverage_percentage: number;
  total_market_skills: number;
}

export interface CareerRoadmapStage {
  stage_number: number;
  id: "current_profile" | "skill_development" | "project_building" | "internship_prep" | "placement_prep" | "career_target";
  title: string;
  status: "completed" | "in_progress" | "upcoming";
  description: string;
  milestones: string[];
  action_cta?: { label: string; href: string };
}

export interface ActionPlanItem {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Recommended";
  category: "skills" | "profile" | "academics" | "internships" | "placements";
  action_link: { label: string; href: string };
  is_completed: boolean;
}

export interface AIGuidanceOverviewData {
  greeting: string;
  student_name: string;
  target_branch: string;
  career_direction: string;
  has_career_direction: boolean;
  readiness_score: number;
  readiness_label: string;
  summary_text: string;
  factors_analyzed: {
    cgpa: number | null;
    entrance_score: number | null;
    branch: string | null;
    location: string | null;
    skills_count: number;
  };
}

export interface CareerReadinessBreakdown {
  academic_profile: number;     // 0-100 (25% weight)
  skills: number;               // 0-100 (25% weight)
  profile_completeness: number; // 0-100 (20% weight)
  opportunity_readiness: number;// 0-100 (30% weight)
}

export interface CareerReadinessScore {
  score: number;
  label: string;
  breakdown: CareerReadinessBreakdown;
  summary: string;
}

export interface PlacementReadinessMetrics {
  total_placements: number;
  eligible_placements: number;
  skill_compatible_placements: number;
  blocked_by_cgpa: number;
  missing_skills_placements: number;
  eligibility_percentage: number;
  top_eligible_companies: string[];
  cgpa_gap_companies: string[];
}

export interface CareerIntelligenceReport {
  readiness: CareerReadinessScore;
  placement_readiness: PlacementReadinessMetrics;
  skill_progress: {
    current_skills: string[];
    recommended_skills: SkillGapItem[];
    coverage_percentage: number;
    total_market_skills: number;
  };
  narrative_summary: {
    strengths: string[];
    skill_gaps: string[];
    opportunity_readiness_text: string;
    suggested_direction: string;
  };
  priority_actions: ActionPlanItem[];
}


