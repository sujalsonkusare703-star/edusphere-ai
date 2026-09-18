"use client";

import React, { useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import { Profile, StudentProfile } from "@/types";
import { User, BookOpen, Award, Sparkles, Plus, X, CheckCircle, AlertCircle } from "@/components/icons";

const SUGGESTED_BRANCHES = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Biotechnology",
  "Management / MBA",
];

const SUGGESTED_SKILLS = [
  "Python",
  "React",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "SQL",
  "Machine Learning",
  "Node.js",
  "Data Structures",
  "Cloud Computing",
  "Figma",
  "Docker",
  "Git",
];

const POPULAR_LOCATIONS = [
  "Maharashtra",
  "Karnataka",
  "Delhi NCR",
  "Telangana",
  "Tamil Nadu",
  "Gujarat",
  "West Bengal",
  "Punjab",
  "Rajasthan",
];

const SUGGESTED_CAREER_GOALS = [
  "Full Stack Developer",
  "AI / Machine Learning Engineer",
  "Data Scientist / Analyst",
  "Cloud & DevOps Engineer",
  "Software Engineer",
  "Cybersecurity Analyst",
  "Product Manager",
  "Mobile App Developer",
];

interface ProfileFormInnerProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  initialSkills: string[];
  updateProfile: (data: {
    fullName: string;
    preferredBranch?: string | null;
    entranceScore?: number | null;
    preferredLocation?: string | null;
    cgpa?: number | null;
    careerGoal?: string | null;
    skills?: string[];
  }) => Promise<{ success: boolean; error?: string }>;
}

function ProfileFormInner({
  user,
  profile,
  studentProfile,
  initialSkills,
  updateProfile,
}: ProfileFormInnerProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [preferredBranch, setPreferredBranch] = useState(studentProfile?.preferred_branch || "");
  const [entranceScore, setEntranceScore] = useState<string>(
    studentProfile?.entrance_score !== null && studentProfile?.entrance_score !== undefined
      ? studentProfile.entrance_score.toString()
      : ""
  );
  const [cgpa, setCgpa] = useState<string>(
    studentProfile?.cgpa !== null && studentProfile?.cgpa !== undefined
      ? studentProfile.cgpa.toString()
      : ""
  );
  const [preferredLocation, setPreferredLocation] = useState(studentProfile?.preferred_location || "");
  const [careerGoal, setCareerGoal] = useState(studentProfile?.career_goal || "");
  const [skillsList, setSkillsList] = useState<string[]>(initialSkills || []);
  const [skillInput, setSkillInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (!skillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillsList([...skillsList, trimmed]);
    }
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s.toLowerCase() !== skillToRemove.toLowerCase()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const parsedScore = entranceScore.trim() ? parseFloat(entranceScore) : null;
      const parsedCgpa = cgpa.trim() ? parseFloat(cgpa) : null;

      // Validate CGPA range (0.00 - 10.00)
      if (parsedCgpa !== null && (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10)) {
        setErrorMsg("Please enter a valid CGPA between 0.00 and 10.00");
        setSaving(false);
        return;
      }

      // Validate entrance score range (0 - 1000)
      if (parsedScore !== null && (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 1000)) {
        setErrorMsg("Please enter a valid entrance score between 0 and 1000");
        setSaving(false);
        return;
      }

      const res = await updateProfile({
        fullName: fullName.trim(),
        cgpa: parsedCgpa,
        entranceScore: parsedScore,
        preferredBranch: preferredBranch.trim() || null,
        preferredLocation: preferredLocation.trim() || null,
        careerGoal: careerGoal.trim() || null,
        skills: skillsList,
      });

      if (res.success) {
        setSuccessMsg("Profile, academic details, and skills updated successfully!");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        const friendlyError = res.error?.includes("violates")
          ? "Invalid data submitted. Please check your inputs."
          : res.error || "Failed to update profile.";
        setErrorMsg(friendlyError);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl text-slate-900">
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F1F5F9]">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Personal Information
            </h2>
            <p className="text-xs text-slate-500">
              Basic account details associated with your profile
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sujal Sonkusare"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Registered Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Verified Supabase Auth Account
            </span>
          </div>
        </div>
      </div>

      {/* Academic & Career Preferences */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F1F5F9]">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Academic & Entrance Details
            </h2>
            <p className="text-xs text-slate-500">
              Used by EduSphere AI to recommend matching colleges and admission cutoffs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Preferred Branch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Preferred Branch / Stream
            </label>
            <input
              type="text"
              list="branches-list"
              value={preferredBranch}
              onChange={(e) => setPreferredBranch(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
            <datalist id="branches-list">
              {SUGGESTED_BRANCHES.map((b, i) => (
                <option key={i} value={b} />
              ))}
            </datalist>
          </div>

          {/* Entrance Score */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Entrance Exam Score / Percentile
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1000"
                value={entranceScore}
                onChange={(e) => setEntranceScore(e.target.value)}
                placeholder="e.g. 96.5"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
              />
              <div className="absolute right-3 top-2.5 text-slate-400">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              JEE, CET, or Academic Marks
            </span>
          </div>

          {/* Cumulative GPA (CGPA) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Cumulative GPA (CGPA)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="e.g. 8.50"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Cumulative score (0.00 – 10.00) used for placement eligibility & AI guidance
            </span>
          </div>

          {/* Preferred Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Preferred Study / Work Location
            </label>
            <input
              type="text"
              list="locations-list"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="e.g. Maharashtra, Karnataka, or Bangalore"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
            <datalist id="locations-list">
              {POPULAR_LOCATIONS.map((loc, i) => (
                <option key={i} value={loc} />
              ))}
            </datalist>
          </div>

          {/* Target Career Role / Goal */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Target Career Role / Goal <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              list="career-goals-list"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. Full Stack Developer, AI Engineer, or Data Scientist"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
            />
            <datalist id="career-goals-list">
              {SUGGESTED_CAREER_GOALS.map((goal, i) => (
                <option key={i} value={goal} />
              ))}
            </datalist>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Helps EduSphere AI tailor your milestone roadmap and internship recommendations
            </span>
          </div>
        </div>
      </div>

      {/* Skills & Competencies */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#F1F5F9]">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Skills & Competencies
            </h2>
            <p className="text-xs text-slate-500">
              Matches your profile directly with internship and placement requirements
            </p>
          </div>
        </div>

        {/* Current Skills Tags */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Your Skills ({skillsList.length})
          </label>
          {skillsList.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-400 italic py-2">
              No skills added yet. Add your programming languages, tools, or domain knowledge below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#EAEAEA] text-slate-800 text-xs font-medium shadow-xs"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Skill Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSkill(skillInput);
              }
            }}
            placeholder="Type a skill (e.g. Python, SQL, React) and press Enter"
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs"
          />
          <button
            type="button"
            onClick={() => handleAddSkill(skillInput)}
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Suggested Skills */}
        <div>
          <span className="text-xs text-slate-500 font-medium block mb-2">
            Click to quickly add common skills:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_SKILLS.filter(
              (s) => !skillsList.some((cur) => cur.toLowerCase() === s.toLowerCase())
            ).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleAddSkill(skill)}
                className="text-xs px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#EAEAEA] hover:border-slate-300 hover:text-slate-900 text-slate-600 transition"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 rounded-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-medium text-sm shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            "Save Profile Changes"
          )}
        </button>
      </div>
    </form>
  );
}

export function ProfileForm() {
  const { user, profile, studentProfile, skills, updateProfile } = useAuth();
  const formKey = [
    user?.id || "anon",
    profile?.full_name || "",
    studentProfile?.id || "sp0",
    studentProfile?.preferred_branch || "",
    studentProfile?.entrance_score ?? "",
    studentProfile?.cgpa ?? "",
    studentProfile?.preferred_location || "",
    studentProfile?.career_goal || "",
    skills.join(","),
  ].join("::");

  return (
    <ProfileFormInner
      key={formKey}
      user={user}
      profile={profile}
      studentProfile={studentProfile}
      initialSkills={skills}
      updateProfile={updateProfile}
    />
  );
}
