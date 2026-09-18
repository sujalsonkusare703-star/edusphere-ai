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
  created_at?: string;
  updated_at?: string;
}

export interface StudentSkill {
  id: string;
  student_profile_id: string;
  skill_name: string;
}

export interface College {
  id: string;
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
}

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


