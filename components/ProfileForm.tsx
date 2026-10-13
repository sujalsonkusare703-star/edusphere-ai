"use client";

import React, { useMemo, useRef, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useAuth } from "@/context/AuthContext";
import type { UpdateProfileParams } from "@/context/AuthContext";
import { Profile, StudentProfile } from "@/types";
import {
  User,
  Award,
  Sparkles,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  MapPin,
  GraduationCap,
} from "@/components/icons";
import {
  DEGREE_LEVELS,
  degreesFor,
  fieldLabel,
  fieldsForLevel,
  levelLabel,
} from "@/lib/degree-master";
import { MAHARASHTRA_DISTRICTS } from "@/lib/maharashtra-districts";
import { AcademicProfile, PROFILE_LIMITS, cleanSkills } from "@/lib/profile-store";

const SUGGESTED_SKILLS = [
  "Python",
  "Java",
  "C++",
  "JavaScript",
  "SQL",
  "Excel",
  "Communication",
  "Data Analysis",
  "Machine Learning",
  "AutoCAD",
  "Tally",
  "Public Speaking",
];

const SUGGESTED_CAREER_GOALS = [
  "Software Engineer",
  "Data Scientist / Analyst",
  "Civil / Mechanical Engineer",
  "Doctor",
  "Pharmacist",
  "Chartered Accountant",
  "Lawyer",
  "Teacher / Professor",
  "Designer",
  "Entrepreneur",
  "Government Services",
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-[#EAEAEA] bg-white text-slate-900 text-base sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition shadow-xs disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "block text-xs font-semibold text-slate-700 mb-2";
const hintClass = "text-[11px] text-slate-400 mt-1 block";

interface FormValues {
  fullName: string;
  degreeLevel: string;
  field: string;
  degree: string;
  specialisation: string;
  collegeName: string;
  collegeDistrict: string;
  preferredDistrict: string;
  entranceScore: string;
  cgpa: string;
  careerGoal: string;
  skills: string[];
}

function toFormValues(profile: Profile | null, sp: StudentProfile | null, skills: string[]): FormValues {
  return {
    fullName: profile?.full_name ?? "",
    degreeLevel: sp?.degree_level_code ?? "",
    field: sp?.field_code ?? "",
    degree: sp?.preferred_degree ?? "",
    specialisation: sp?.specialisation ?? "",
    collegeName: sp?.college_name ?? "",
    collegeDistrict: sp?.college_district ?? "",
    preferredDistrict: sp?.preferred_district ?? sp?.preferred_location ?? "",
    entranceScore: sp?.entrance_score != null ? String(sp.entrance_score) : "",
    cgpa: sp?.cgpa != null ? String(sp.cgpa) : "",
    careerGoal: sp?.career_goal ?? "",
    skills: [...skills],
  };
}

function sameValues(a: FormValues, b: FormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Options list that always contains the current value, so a saved value never disappears. */
function withSavedValue(options: { value: string; label: string }[], current: string, label: (v: string) => string) {
  if (!current || options.some((o) => o.value === current)) return options;
  return [{ value: current, label: `${label(current)} (saved)` }, ...options];
}

interface ProfileFormInnerProps {
  user: SupabaseUser;
  initial: FormValues;
  updateProfile: (data: UpdateProfileParams) => Promise<{ success: boolean; error?: string }>;
}

function ProfileFormInner({ user, initial, updateProfile }: ProfileFormInnerProps) {
  const [values, setValues] = useState<FormValues>(initial);
  const [savedValues, setSavedValues] = useState<FormValues>(initial);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const submittingRef = useRef(false);

  const dirty = !sameValues(values, savedValues);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus((prev) => (prev?.type === "success" ? null : prev));
  };

  // Cascade: level -> field -> degree
  const levelOptions = useMemo(
    () =>
      withSavedValue(
        DEGREE_LEVELS.map((l) => ({ value: l.code, label: l.label })),
        values.degreeLevel,
        levelLabel
      ),
    [values.degreeLevel]
  );

  const fieldOptions = useMemo(
    () =>
      withSavedValue(
        fieldsForLevel(values.degreeLevel).map((code) => ({ value: code, label: fieldLabel(code) })),
        values.field,
        fieldLabel
      ),
    [values.degreeLevel, values.field]
  );

  const degreeOptions = useMemo(
    () =>
      withSavedValue(
        degreesFor(values.field, values.degreeLevel).map(([, , degree, fullName]) => ({
          value: degree,
          label: fullName && fullName !== degree ? `${degree} (${fullName})` : degree,
        })),
        values.degree,
        (v) => v
      ),
    [values.field, values.degreeLevel, values.degree]
  );

  const districtOptions = (current: string) =>
    withSavedValue(
      MAHARASHTRA_DISTRICTS.map((d) => ({ value: d, label: d })),
      current,
      (v) => v
    );

  const onLevelChange = (level: string) => {
    setValues((prev) => {
      const fieldStillValid = !prev.field || fieldsForLevel(level).includes(prev.field);
      const field = fieldStillValid ? prev.field : "";
      const degreeStillValid = degreesFor(field, level).some(([, , d]) => d === prev.degree);
      return { ...prev, degreeLevel: level, field, degree: degreeStillValid ? prev.degree : "" };
    });
    setStatus(null);
  };

  const onFieldChange = (field: string) => {
    setValues((prev) => {
      const degreeStillValid = degreesFor(field, prev.degreeLevel).some(([, , d]) => d === prev.degree);
      return { ...prev, field, degree: degreeStillValid ? prev.degree : "" };
    });
    setStatus(null);
  };

  const addSkill = (raw: string) => {
    if (!raw.trim()) return;
    const isDuplicate = values.skills.some((s) => s.toLowerCase() === raw.trim().toLowerCase());
    if (!isDuplicate && values.skills.length >= PROFILE_LIMITS.skills) {
      setStatus({ type: "error", text: `You can add up to ${PROFILE_LIMITS.skills} skills.` });
      return;
    }
    set("skills", cleanSkills([...values.skills, raw]));
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    set(
      "skills",
      values.skills.filter((s) => s.toLowerCase() !== skill.toLowerCase())
    );
  };

  const validate = (v: FormValues): { error: string } | { academic: AcademicProfile; fullName: string } => {
    const fullName = v.fullName.trim();
    if (!fullName) return { error: "Please enter your full name." };

    const parseOptional = (raw: string) => (raw.trim() === "" ? null : Number(raw));
    const score = parseOptional(v.entranceScore);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 1000)) {
      return { error: "Entrance exam score must be a number between 0 and 1000." };
    }
    const cgpa = parseOptional(v.cgpa);
    if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) {
      return { error: "CGPA must be a number between 0 and 10." };
    }

    return {
      fullName,
      academic: {
        degree_level: v.degreeLevel || null,
        field: v.field || null,
        degree: v.degree || null,
        specialisation: v.specialisation.trim() || null,
        college_name: v.collegeName.trim() || null,
        college_district: v.collegeDistrict || null,
        preferred_district: v.preferredDistrict || null,
        entrance_score: score,
        cgpa,
        career_goal: v.careerGoal.trim() || null,
        skills: v.skills,
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    // Include a skill that was typed but not yet added.
    const pendingSkill = skillInput.trim();
    const submitValues = pendingSkill ? { ...values, skills: cleanSkills([...values.skills, pendingSkill]) } : values;
    if (pendingSkill) {
      setValues(submitValues);
      setSkillInput("");
    }

    const result = validate(submitValues);
    if ("error" in result) {
      setStatus({ type: "error", text: result.error });
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setStatus(null);
    try {
      const res = await updateProfile({ fullName: result.fullName, academic: result.academic });
      if (res.success) {
        const normalised: FormValues = { ...submitValues, fullName: result.fullName };
        setValues(normalised);
        setSavedValues(normalised);
        setStatus({ type: "success", text: "Your profile has been saved." });
      } else {
        setStatus({ type: "error", text: res.error || "Could not save your profile. Please try again." });
      }
    } catch {
      setStatus({ type: "error", text: "Could not save your profile. Please check your connection and try again." });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const statusBox = status && (
    <div
      role={status.type === "error" ? "alert" : "status"}
      className={
        status.type === "success"
          ? "p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm"
          : "p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5"
      }
    >
      {status.type === "success" ? (
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <span className="font-medium">{status.text}</span>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6 sm:space-y-8 max-w-4xl text-slate-900 pb-24 sm:pb-0">
      {statusBox}

      {/* 1. Personal information */}
      <Section icon={<User className="w-5 h-5" />} tone="indigo" title="Personal information" subtitle="Your name as shown on EduSphere AI">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label htmlFor="pf-name" className={labelClass}>Full name *</label>
            <input
              id="pf-name"
              type="text"
              required
              maxLength={PROFILE_LIMITS.text}
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="pf-email" className={labelClass}>Email</label>
            <input id="pf-email" type="email" disabled value={user.email || ""} className={`${inputClass} cursor-not-allowed`} />
            <span className={hintClass}>Your sign-in email cannot be changed here.</span>
          </div>
        </div>
      </Section>

      {/* 2. Current study */}
      <Section icon={<GraduationCap className="w-5 h-5" />} tone="violet" title="Your course" subtitle="Choose the level first, then the field and degree">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label htmlFor="pf-level" className={labelClass}>Degree level</label>
            <select id="pf-level" value={values.degreeLevel} onChange={(e) => onLevelChange(e.target.value)} className={inputClass}>
              <option value="">Select level…</option>
              {levelOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pf-field" className={labelClass}>Field</label>
            <select
              id="pf-field"
              value={values.field}
              onChange={(e) => onFieldChange(e.target.value)}
              disabled={!values.degreeLevel && !values.field}
              className={inputClass}
            >
              <option value="">{values.degreeLevel ? "Select field…" : "Select a level first"}</option>
              {fieldOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pf-degree" className={labelClass}>Degree</label>
            <select
              id="pf-degree"
              value={values.degree}
              onChange={(e) => set("degree", e.target.value)}
              disabled={(!values.degreeLevel || !values.field) && !values.degree}
              className={inputClass}
            >
              <option value="">
                {values.degreeLevel && values.field
                  ? degreeOptions.length > 0
                    ? "Select degree…"
                    : "No degrees listed for this choice"
                  : "Select level and field first"}
              </option>
              {degreeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pf-spec" className={labelClass}>
              Specialisation / branch <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="pf-spec"
              type="text"
              maxLength={PROFILE_LIMITS.text}
              value={values.specialisation}
              onChange={(e) => set("specialisation", e.target.value)}
              placeholder="e.g. Computer Engineering, Finance"
              className={inputClass}
            />
          </div>
        </div>
      </Section>

      {/* 3. College and location */}
      <Section icon={<MapPin className="w-5 h-5" />} tone="indigo" title="College and location" subtitle="Your current college and where you would like to study next">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="sm:col-span-2">
            <label htmlFor="pf-college" className={labelClass}>College name</label>
            <input
              id="pf-college"
              type="text"
              maxLength={PROFILE_LIMITS.text}
              autoComplete="organization"
              value={values.collegeName}
              onChange={(e) => set("collegeName", e.target.value)}
              placeholder="Type your college name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="pf-college-district" className={labelClass}>College district</label>
            <select id="pf-college-district" value={values.collegeDistrict} onChange={(e) => set("collegeDistrict", e.target.value)} className={inputClass}>
              <option value="">Select district…</option>
              {districtOptions(values.collegeDistrict).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pf-pref-district" className={labelClass}>
              Preferred district for further study <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select id="pf-pref-district" value={values.preferredDistrict} onChange={(e) => set("preferredDistrict", e.target.value)} className={inputClass}>
              <option value="">Any district in Maharashtra</option>
              {districtOptions(values.preferredDistrict).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* 4. Scores and goals */}
      <Section icon={<Award className="w-5 h-5" />} tone="amber" title="Scores and career goal" subtitle="All optional; leave blank if not known">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div>
            <label htmlFor="pf-score" className={labelClass}>Entrance exam score / percentile</label>
            <input
              id="pf-score"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="1000"
              value={values.entranceScore}
              onChange={(e) => set("entranceScore", e.target.value)}
              placeholder="e.g. 96.5"
              className={inputClass}
            />
            <span className={hintClass}>For example your MHT-CET percentile or JEE Main score.</span>
          </div>

          <div>
            <label htmlFor="pf-cgpa" className={labelClass}>CGPA (0–10)</label>
            <input
              id="pf-cgpa"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="10"
              value={values.cgpa}
              onChange={(e) => set("cgpa", e.target.value)}
              placeholder="e.g. 8.5"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="pf-goal" className={labelClass}>Career goal</label>
            <input
              id="pf-goal"
              type="text"
              list="career-goals-list"
              maxLength={PROFILE_LIMITS.careerGoal}
              value={values.careerGoal}
              onChange={(e) => set("careerGoal", e.target.value)}
              placeholder="e.g. Software Engineer"
              className={inputClass}
            />
            <datalist id="career-goals-list">
              {SUGGESTED_CAREER_GOALS.map((goal) => (
                <option key={goal} value={goal} />
              ))}
            </datalist>
          </div>
        </div>
      </Section>

      {/* 5. Skills */}
      <Section icon={<Sparkles className="w-5 h-5" />} tone="emerald" title="Skills" subtitle="Add the skills you already have">
        <div className="mb-4">
          <span className={labelClass}>Your skills ({values.skills.length})</span>
          {values.skills.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-2">No skills added yet.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 p-3 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              {values.skills.map((skill) => (
                <li
                  key={skill}
                  className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg bg-white border border-[#EAEAEA] text-slate-800 text-xs font-medium shadow-xs max-w-full"
                >
                  <span className="truncate">{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <label htmlFor="pf-skill" className="sr-only">Add a skill</label>
          <input
            id="pf-skill"
            type="text"
            maxLength={PROFILE_LIMITS.skill}
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
            placeholder="Type a skill and press Enter"
            className={`${inputClass} flex-1 min-w-0`}
          />
          <button
            type="button"
            onClick={() => addSkill(skillInput)}
            disabled={!skillInput.trim()}
            className="px-4 sm:px-5 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-40 text-white rounded-xl text-sm font-medium transition flex items-center gap-1.5 shadow-xs flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div>
          <span className="text-xs text-slate-500 font-medium block mb-2">Suggestions:</span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_SKILLS.filter((s) => !values.skills.some((cur) => cur.toLowerCase() === s.toLowerCase())).map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="text-xs px-2.5 py-1.5 rounded-md bg-[#FAFAFA] border border-[#EAEAEA] hover:border-slate-300 hover:text-slate-900 text-slate-600 transition"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Save bar: sticky on phones so the button is always reachable */}
      <div className="fixed sm:static bottom-0 inset-x-0 z-20 bg-white/95 sm:bg-transparent backdrop-blur sm:backdrop-blur-none border-t sm:border-0 border-[#EAEAEA] px-4 py-3 sm:p-0 sm:pt-2 flex items-center justify-between sm:justify-end gap-4">
        <span className="text-xs text-slate-500" aria-live="polite">
          {saving ? "Saving…" : dirty ? "You have unsaved changes" : "All changes saved"}
        </span>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="px-6 sm:px-8 py-3 rounded-full bg-slate-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm shadow-sm transition flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            "Save profile"
          )}
        </button>
      </div>
    </form>
  );
}

const TONES = {
  indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
  violet: "bg-violet-50 border-violet-100 text-violet-600",
  amber: "bg-amber-50 border-amber-100 text-amber-600",
  emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
} as const;

function Section({
  icon,
  tone,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-[#EAEAEA] rounded-2xl p-5 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-5 sm:mb-6 pb-4 border-b border-[#F1F5F9]">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function ProfileForm() {
  const { user, profile, studentProfile, skills, loading, updateProfile, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="bg-white border border-[#EAEAEA] rounded-2xl p-8 shadow-sm flex items-center gap-3 text-sm text-slate-500" role="status">
        <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" />
        Loading your profile…
      </div>
    );
  }

  if (!user || !studentProfile) {
    return (
      <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-3" role="alert">
        <p className="font-medium">We could not load your profile. Your saved details have not been changed.</p>
        <button
          type="button"
          onClick={() => refreshProfile()}
          className="px-4 py-2 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }

  // Mount once per signed-in user; later context updates (our own save, token refresh)
  // must not reset what the student is typing.
  return (
    <ProfileFormInner
      key={user.id}
      user={user}
      initial={toFormValues(profile, studentProfile, skills)}
      updateProfile={updateProfile}
    />
  );
}
