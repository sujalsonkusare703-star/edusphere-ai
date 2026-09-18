import { College, Internship, Placement, Profile, StudentProfile, RecommendationItem } from "@/types";

export const demoColleges: College[] = [
  {
    id: "col-1",
    name: "MIT ADT University",
    location: "Pune",
    state: "Maharashtra",
    course: "Computer Science & Engineering",
    fees: 215000,
    entrance_exam: "MHT-CET / JEE",
    placement_rate: 92,
    avg_package: 750000,
    highest_package: 2800000,
    college_type: "Private University",
  },
  {
    id: "col-2",
    name: "College of Engineering Pune (COEP)",
    location: "Pune",
    state: "Maharashtra",
    course: "Computer Engineering",
    fees: 135000,
    entrance_exam: "MHT-CET",
    placement_rate: 96,
    avg_package: 1120000,
    highest_package: 3900000,
    college_type: "Autonomous State Institute",
  },
  {
    id: "col-3",
    name: "Indian Institute of Technology Bombay (IIT Bombay)",
    location: "Mumbai",
    state: "Maharashtra",
    course: "Computer Science & Engineering",
    fees: 230000,
    entrance_exam: "JEE Advanced",
    placement_rate: 98,
    avg_package: 2180000,
    highest_package: 16800000,
    college_type: "Institute of National Importance",
  },
  {
    id: "col-4",
    name: "Birla Institute of Technology and Science (BITS Pilani)",
    location: "Pilani",
    state: "Rajasthan",
    course: "Computer Science & Engineering",
    fees: 495000,
    entrance_exam: "BITSAT",
    placement_rate: 95,
    avg_package: 1850000,
    highest_package: 6000000,
    college_type: "Deemed University",
  },
  {
    id: "col-5",
    name: "Vellore Institute of Technology (VIT)",
    location: "Vellore",
    state: "Tamil Nadu",
    course: "Information Technology",
    fees: 198000,
    entrance_exam: "VITEEE",
    placement_rate: 90,
    avg_package: 900000,
    highest_package: 4400000,
    college_type: "Deemed University",
  },
  {
    id: "col-6",
    name: "International Institute of Information Technology Hyderabad (IIIT-H)",
    location: "Hyderabad",
    state: "Telangana",
    course: "Artificial Intelligence & Data Science",
    fees: 360000,
    entrance_exam: "JEE Main",
    placement_rate: 97,
    avg_package: 2400000,
    highest_package: 7400000,
    college_type: "Autonomous University",
  },
  {
    id: "col-7",
    name: "Delhi Technological University (DTU)",
    location: "New Delhi",
    state: "Delhi NCR",
    course: "Software Engineering",
    fees: 165000,
    entrance_exam: "JEE Main",
    placement_rate: 93,
    avg_package: 1540000,
    highest_package: 5100000,
    college_type: "State University",
  },
  {
    id: "col-8",
    name: "RV College of Engineering",
    location: "Bangalore",
    state: "Karnataka",
    course: "Computer Science & Engineering",
    fees: 220000,
    entrance_exam: "KCET / COMEDK",
    placement_rate: 94,
    avg_package: 1200000,
    highest_package: 4200000,
    college_type: "Autonomous Private",
  },
];

export const demoInternships: Internship[] = [
  {
    id: "int-1",
    role: "Frontend Developer",
    company: "TechSphere Cloud Labs",
    stipend: "₹25,000 / month",
    duration: "3 Months",
    location: "Remote",
    remote: true,
    skills: ["React", "TypeScript", "JavaScript", "Next.js", "Tailwind CSS"],
  },
  {
    id: "int-2",
    role: "Full Stack Engineering Intern",
    company: "Nexa Innovations",
    stipend: "₹30,000 / month",
    duration: "6 Months",
    location: "Bangalore, Karnataka",
    remote: false,
    skills: ["Node.js", "React", "SQL", "Git", "JavaScript"],
  },
  {
    id: "int-3",
    role: "AI / Machine Learning Research Intern",
    company: "DeepMind Labs India",
    stipend: "₹40,000 / month",
    duration: "6 Months",
    location: "Pune, Maharashtra",
    remote: true,
    skills: ["Python", "Machine Learning", "Data Structures", "Docker"],
  },
  {
    id: "int-4",
    role: "Data Analyst Intern",
    company: "MetricFlow Analytics",
    stipend: "₹20,000 / month",
    duration: "3 Months",
    location: "Mumbai, Maharashtra",
    remote: false,
    skills: ["Python", "SQL", "Cloud Computing", "Git"],
  },
  {
    id: "int-5",
    role: "Cloud & DevOps Engineering Intern",
    company: "CloudScale Systems",
    stipend: "₹28,000 / month",
    duration: "4 Months",
    location: "Hyderabad, Telangana",
    remote: true,
    skills: ["Docker", "Cloud Computing", "Git", "Python"],
  },
  {
    id: "int-6",
    role: "UI/UX Design & Frontend Intern",
    company: "PixelCraft Studio",
    stipend: "₹22,000 / month",
    duration: "3 Months",
    location: "Delhi NCR",
    remote: true,
    skills: ["Figma", "React", "JavaScript", "Tailwind CSS"],
  },
];

export const demoPlacements: Placement[] = [
  {
    id: "plc-1",
    company: "Apex Enterprise Systems",
    role: "Software Engineer",
    industry: "Technology & FinTech",
    min_cgpa: 7.5,
    location: "Pune & Bangalore",
    skills: ["Java", "Python", "SQL", "Data Structures"],
  },
  {
    id: "plc-2",
    company: "HyperScale Networks",
    role: "Associate Cloud Architect",
    industry: "Cloud Infrastructure",
    min_cgpa: 7.0,
    location: "Hyderabad, Telangana",
    skills: ["Cloud Computing", "Docker", "Git", "Python"],
  },
  {
    id: "plc-3",
    company: "Cognita AI",
    role: "AI Systems Engineer",
    industry: "Artificial Intelligence",
    min_cgpa: 8.0,
    location: "Bangalore, Karnataka",
    skills: ["Python", "Machine Learning", "Data Structures", "C++"],
  },
  {
    id: "plc-4",
    company: "FinVantage Global",
    role: "Full Stack Product Engineer",
    industry: "Banking & Financial Services",
    min_cgpa: 6.5,
    location: "Mumbai, Maharashtra",
    skills: ["React", "Node.js", "TypeScript", "SQL"],
  },
  {
    id: "plc-5",
    company: "Vector Dynamics",
    role: "Core Systems Engineer",
    industry: "Automotive & Embedded IoT",
    min_cgpa: 7.0,
    location: "Chennai, Tamil Nadu",
    skills: ["C++", "Python", "Data Structures"],
  },
  {
    id: "plc-6",
    company: "KPMG Analytics",
    role: "Data & Analytics Consultant",
    industry: "Consulting & Professional Services",
    min_cgpa: 6.0,
    location: "Gurgaon, Delhi NCR",
    skills: ["SQL", "Python", "Cloud Computing"],
  },
];

export const defaultDemoProfile: {
  profile: Profile;
  studentProfile: StudentProfile;
  skills: string[];
} = {
  profile: {
    id: "demo-user-123",
    full_name: "Sujal Sonkusare",
    role: "student",
  },
  studentProfile: {
    id: "sp-demo-001",
    profile_id: "demo-user-123",
    preferred_branch: "Computer Science & Engineering",
    entrance_score: 96.5,
    preferred_location: "Maharashtra",
    cgpa: 8.5,
    career_goal: "Full Stack AI Engineer",
  },
  skills: ["Python", "React", "JavaScript", "SQL", "Data Structures"],
};

export { calculateProfileStrength } from "./profile-utils";

/**
 * Generates transparent AI recommendation matches based on student profile and demo datasets.
 */
export function generateDemoRecommendations(
  studentProfile: StudentProfile | null,
  skills: string[],
  colleges: College[] = demoColleges,
  internships: Internship[] = demoInternships,
  placements: Placement[] = demoPlacements
): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  const targetBranch = studentProfile?.preferred_branch?.toLowerCase().trim() || "";
  const targetLocation = studentProfile?.preferred_location?.toLowerCase().trim() || "";
  const entranceScore = studentProfile?.entrance_score || 0;
  const studentCgpa = studentProfile?.cgpa || 0;
  const lowerSkills = skills.map((s) => s.toLowerCase().trim());

  // 1. Colleges matching
  colleges.forEach((c) => {
    const reasons: string[] = [];
    let score = 52;

    const courseLower = c.course?.toLowerCase() || "";
    const locLower = c.location?.toLowerCase() || "";
    const stateLower = c.state?.toLowerCase() || "";

    if (targetBranch && (courseLower.includes(targetBranch) || targetBranch.includes(courseLower))) {
      score += 26;
      reasons.push(`Direct alignment with your target stream (${c.course})`);
    }

    if (targetLocation && (locLower.includes(targetLocation) || stateLower.includes(targetLocation))) {
      score += 12;
      reasons.push(`Located in your preferred region (${c.location ? `${c.location}, ` : ""}${c.state})`);
    }

    if (entranceScore > 0) {
      score += 8;
      reasons.push(`Entrance score of ${entranceScore} exceeds historical cutoff benchmark`);
    }

    if (c.placement_rate && c.placement_rate >= 90) {
      score += 4;
      reasons.push(`High campus placement record (${c.placement_rate}%)`);
    }

    const finalScore = Math.min(Math.max(score, 65), 98);
    items.push({
      id: c.id,
      item_type: "college",
      title: c.name,
      subtitle: `${c.course || "Degree"} • ${c.location ? `${c.location}, ` : ""}${c.state || "India"}`,
      match_score: finalScore,
      match_reasons: reasons.length > 0 ? reasons : ["Accredited institution matching your academic profile"],
      college: c,
      is_ai_recommended: finalScore >= 85,
    });
  });

  // 2. Internships matching
  internships.forEach((item) => {
    const reasons: string[] = [];
    let score = 55;

    const matchedSkills = (item.skills || []).filter((reqSkill) =>
      lowerSkills.includes(reqSkill.toLowerCase().trim())
    );

    if (matchedSkills.length > 0) {
      score += Math.min(matchedSkills.length * 12, 32);
      reasons.push(`Directly matches ${matchedSkills.length} of your recorded skills (${matchedSkills.join(", ")})`);
    }

    if (item.remote) {
      score += 6;
      reasons.push("Remote flexibility accommodates ongoing semester curriculum");
    }

    if (targetBranch && (item.role.toLowerCase().includes("engineer") || item.role.toLowerCase().includes("developer"))) {
      score += 4;
      reasons.push(`Role aligns with your academic stream (${studentProfile?.preferred_branch || "Technology"})`);
    }

    const finalScore = Math.min(Math.max(score, 60), 96);
    items.push({
      id: item.id,
      item_type: "internship",
      title: item.role,
      subtitle: `${item.company} • ${item.stipend || "Stipend Available"} • ${item.duration || "Internship"}`,
      match_score: finalScore,
      match_reasons: reasons.length > 0 ? reasons : ["Open position matching your technical background"],
      internship: item,
      is_ai_recommended: finalScore >= 85,
    });
  });

  // 3. Placements matching
  placements.forEach((item) => {
    const reasons: string[] = [];
    let score = 58;

    if (studentCgpa > 0 && item.min_cgpa && studentCgpa >= item.min_cgpa) {
      score += 18;
      reasons.push(`Academic CGPA (${studentCgpa}) satisfies recruitment eligibility cutoff (≥ ${item.min_cgpa})`);
    }

    const matchedSkills = (item.skills || []).filter((reqSkill) =>
      lowerSkills.includes(reqSkill.toLowerCase().trim())
    );

    if (matchedSkills.length > 0) {
      score += Math.min(matchedSkills.length * 10, 24);
      reasons.push(`Target skills matched: ${matchedSkills.join(", ")}`);
    }

    if (item.industry) {
      reasons.push(`Industry sector: ${item.industry}`);
    }

    const finalScore = Math.min(Math.max(score, 65), 97);
    items.push({
      id: item.id,
      item_type: "placement",
      title: item.role,
      subtitle: `${item.company} • ${item.industry || "Technology"} • ${item.location || "Multiple Locations"}`,
      match_score: finalScore,
      match_reasons: reasons.length > 0 ? reasons : ["Full-time opportunity for graduate students"],
      placement: item,
      is_ai_recommended: finalScore >= 85,
    });
  });

  // Sort descending by match_score
  return items.sort((a, b) => b.match_score - a.match_score);
}
