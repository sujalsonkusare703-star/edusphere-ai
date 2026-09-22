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
  cutoffs?: CollegeCutoff[];
}

export interface College {
  id: string;
  source_id?: number | null;
  name: string;
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
  company: string;
  role: string;
  industry: string | null;
  min_cgpa: number | null;
  location: string | null;
  skills?: string[];
}

export interface PlacementSkill {
  id: string;
  placement_id: string;
  skill_name: string;
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


