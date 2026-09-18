"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isUuid, itemIdToDbUuid, dbUuidToItemId, normalizeAndDeduplicateSkills } from "@/lib/supabase/db-helpers";
import { Profile, StudentProfile } from "@/types";
import { defaultDemoProfile } from "@/lib/demo-data";
import { useRouter } from "next/navigation";

interface UpdateProfileParams {
  fullName: string;
  cgpa?: number | null;
  entranceScore?: number | null;
  preferredBranch?: string | null;
  preferredLocation?: string | null;
  careerGoal?: string | null;
  skills?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  studentProfile: StudentProfile | null;
  skills: string[];
  savedItemIds: Set<string>;
  loading: boolean;
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<Session | null>;
  refreshProfile: (explicitUser?: User | null) => Promise<void>;
  updateProfile: (data: UpdateProfileParams) => Promise<{ success: boolean; error?: string }>;
  toggleSaveItem: (itemType: "college" | "internship" | "placement", itemId: string) => Promise<boolean>;
  isItemSaved: (itemId: string) => boolean;
  loginDemo: (email: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signupDemo: (fullName: string, email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_USER_KEY = "edusphere_demo_user";
const LS_PROFILE_KEY = "edusphere_demo_profile";
const LS_STUDENT_PROFILE_KEY = "edusphere_demo_student_profile";
const LS_SKILLS_KEY = "edusphere_demo_skills";
const LS_SAVED_KEY = "edusphere_demo_saved_items";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const inFlightLoadRef = useRef<Map<string, Promise<void>>>(new Map());

  // Helper to persist demo state to localStorage
  const persistDemoState = useCallback((
    u: User | null,
    p: Profile | null,
    sp: StudentProfile | null,
    sk: string[],
    saved: Set<string>
  ) => {
    if (typeof window === "undefined") return;
    try {
      if (u) {
        localStorage.setItem(LS_USER_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(LS_USER_KEY);
      }
      if (p) {
        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(p));
      } else {
        localStorage.removeItem(LS_PROFILE_KEY);
      }
      if (sp) {
        localStorage.setItem(LS_STUDENT_PROFILE_KEY, JSON.stringify(sp));
      } else {
        localStorage.removeItem(LS_STUDENT_PROFILE_KEY);
      }
      localStorage.setItem(LS_SKILLS_KEY, JSON.stringify(sk));
      localStorage.setItem(LS_SAVED_KEY, JSON.stringify(Array.from(saved)));
    } catch (e) {
      console.warn("Failed saving demo state to localStorage:", e);
    }
  }, []);

  // Hydrate from localStorage or default demo profile
  const hydrateDemoState = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = localStorage.getItem(LS_USER_KEY);
      if (!storedUser) return null;

      const parsedUser = JSON.parse(storedUser) as User;
      const storedProfile = localStorage.getItem(LS_PROFILE_KEY);
      const storedSP = localStorage.getItem(LS_STUDENT_PROFILE_KEY);
      const storedSkills = localStorage.getItem(LS_SKILLS_KEY);
      const storedSaved = localStorage.getItem(LS_SAVED_KEY);

      const parsedProfile: Profile = storedProfile
        ? JSON.parse(storedProfile)
        : defaultDemoProfile.profile;
      const parsedSP: StudentProfile = storedSP
        ? JSON.parse(storedSP)
        : defaultDemoProfile.studentProfile;
      const parsedSkills: string[] = storedSkills
        ? JSON.parse(storedSkills)
        : defaultDemoProfile.skills;
      const parsedSavedIds = new Set<string>(
        storedSaved ? JSON.parse(storedSaved) : ["col-1", "int-1", "plc-1"]
      );

      return {
        user: parsedUser,
        profile: parsedProfile,
        studentProfile: parsedSP,
        skills: parsedSkills,
        savedItemIds: parsedSavedIds,
      };
    } catch (e) {
      console.warn("Error hydrating demo state from localStorage:", e);
      return null;
    }
  }, []);

  // Load or initialize profile data for the authenticated user
  const loadUserProfile = useCallback(async (currentUser: User) => {
    if (!currentUser?.id) return;

    // Deduplicate concurrent loads for the same user ID
    const activePromise = inFlightLoadRef.current.get(currentUser.id);
    if (activePromise) {
      return activePromise;
    }

    const currentLoad = (async () => {
      const isDemoUser = currentUser.id.startsWith("demo-");
      if (isDemoUser) {
        return;
      }

      const defaultFullName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "Student";

      const userProfileKey = `edusphere_profile_${currentUser.id}`;
      const userStudentKey = `edusphere_student_profile_${currentUser.id}`;
      const userSkillsKey = `edusphere_skills_${currentUser.id}`;
      const userSavedKey = `edusphere_saved_${currentUser.id}`;

      let localP: Profile | null = null;
      let localSkills: string[] | null = null;

      if (typeof window !== "undefined") {
        try {
          const pStr = localStorage.getItem(userProfileKey);
          const skStr = localStorage.getItem(userSkillsKey);
          if (pStr) localP = JSON.parse(pStr);
          if (skStr) localSkills = JSON.parse(skStr);
        } catch (e) {
          console.warn("Local profile cache read error:", e);
        }
      }

      // REAL SUPABASE DATABASE QUERY — SUPABASE IS AUTHORITATIVE
      try {
        // 1. Fetch public.profiles from Supabase
        let activeProfile: Profile = {
          id: currentUser.id,
          full_name: defaultFullName,
          role: "student",
          created_at: currentUser.created_at,
          updated_at: new Date().toISOString(),
        };

        const { data: dbProfile, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (profErr) {
          console.warn("Supabase profiles fetch note:", profErr.message);
        }

        if (dbProfile) {
          activeProfile = dbProfile as Profile;
        } else if (localP && profErr) {
          activeProfile = localP;
        }

        // 2. Fetch public.student_profiles from Supabase by profile_id
        let activeSP: StudentProfile | null = null;
        const { data: dbSP, error: spFetchErr } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("profile_id", currentUser.id)
          .maybeSingle();

        if (spFetchErr) {
          console.warn("Supabase student_profiles fetch note:", spFetchErr.message);
        }

        if (dbSP) {
          const remoteCgpa = (dbSP as unknown as Record<string, unknown>).cgpa;
          const resolvedCgpa =
            remoteCgpa !== undefined && remoteCgpa !== null
              ? Number(remoteCgpa)
              : null;

          activeSP = {
            id: dbSP.id,
            profile_id: dbSP.profile_id,
            preferred_branch: dbSP.preferred_branch ?? null,
            entrance_score:
              dbSP.entrance_score !== null && dbSP.entrance_score !== undefined
                ? Number(dbSP.entrance_score)
                : null,
            preferred_location: dbSP.preferred_location ?? null,
            career_goal: dbSP.career_goal ?? null,
            cgpa: resolvedCgpa,
            created_at: dbSP.created_at,
            updated_at: dbSP.updated_at,
          };
        } else {
          // Initial empty profile for user without a student_profiles row yet
          activeSP = {
            id: `sp-${currentUser.id.slice(0, 8)}`,
            profile_id: currentUser.id,
            preferred_branch: null,
            entrance_score: null,
            preferred_location: null,
            cgpa: null,
            career_goal: null,
          };
        }

        // 3. Fetch public.student_skills from Supabase using activeSP.id
        let loadedSkills: string[] = [];
        if (activeSP.id && isUuid(activeSP.id)) {
          const { data: dbSkills, error: skillsErr } = await supabase
            .from("student_skills")
            .select("skill_name")
            .eq("student_profile_id", activeSP.id);

          if (!skillsErr && dbSkills) {
            loadedSkills = normalizeAndDeduplicateSkills(dbSkills.map((s) => s.skill_name));
          } else if (skillsErr) {
            console.warn("Supabase student_skills fetch note:", skillsErr.message);
            if (localSkills) loadedSkills = localSkills;
          }
        }

        // 4. Fetch public.saved_items from Supabase using activeSP.id
        let loadedSaved: Set<string> = new Set();
        if (activeSP.id && isUuid(activeSP.id)) {
          const { data: dbSaved, error: savedErr } = await supabase
            .from("saved_items")
            .select("item_id, item_type")
            .eq("student_profile_id", activeSP.id);

          if (!savedErr && dbSaved !== null) {
            loadedSaved = new Set<string>(dbSaved.map((r) => dbUuidToItemId(r.item_id)));
          }
        }

        // 5. ATOMIC STATE UPDATES FROM SUPABASE
        setProfile(activeProfile);
        setStudentProfile(activeSP);
        setSkills(loadedSkills);
        setSavedItemIds(loadedSaved);

        // 6. Update user-scoped localStorage cache to match authoritative Supabase data
        if (typeof window !== "undefined") {
          localStorage.setItem(userProfileKey, JSON.stringify(activeProfile));
          localStorage.setItem(userStudentKey, JSON.stringify(activeSP));
          localStorage.setItem(userSkillsKey, JSON.stringify(loadedSkills));
          localStorage.setItem(userSavedKey, JSON.stringify(Array.from(loadedSaved)));
        }
      } catch (err) {
        console.warn("Supabase profile load error:", err);
      }
    })();

    inFlightLoadRef.current.set(currentUser.id, currentLoad);
    try {
      await currentLoad;
    } finally {
      inFlightLoadRef.current.delete(currentUser.id);
    }
  }, [supabase]);

  // Set up real Supabase Auth listener as single source of truth
  useEffect(() => {
    let isMounted = true;

    // 1. Listen for real Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        // Keep session synchronized for TOKEN_REFRESHED, INITIAL_SESSION, SIGNED_IN
        setSession(currentSession);

        if (currentSession?.user) {
          setLoading(true);
          setUser(currentSession.user);
          await loadUserProfile(currentSession.user);
          if (typeof window !== "undefined") {
            localStorage.removeItem("edusphere_demo_active");
          }
        } else {
          setSession(null);
          // Check if explicit demo session was activated
          const isDemoActive = typeof window !== "undefined" && localStorage.getItem("edusphere_demo_active") === "true";
          if (isDemoActive) {
            const demoHydrated = hydrateDemoState();
            if (demoHydrated) {
              setUser(demoHydrated.user);
              setProfile(demoHydrated.profile);
              setStudentProfile(demoHydrated.studentProfile);
              setSkills(demoHydrated.skills);
              setSavedItemIds(demoHydrated.savedItemIds);
              setLoading(false);
              return;
            }
          }
          setUser(null);
          setProfile(null);
          setStudentProfile(null);
          setSkills([]);
          setSavedItemIds(new Set());
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    // 2. Initial session check on mount
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        setUser(initialSession.user);
        await loadUserProfile(initialSession.user);
      } else {
        const isDemoActive = typeof window !== "undefined" && localStorage.getItem("edusphere_demo_active") === "true";
        if (isDemoActive) {
          const demoHydrated = hydrateDemoState();
          if (demoHydrated) {
            setUser(demoHydrated.user);
            setProfile(demoHydrated.profile);
            setStudentProfile(demoHydrated.studentProfile);
            setSkills(demoHydrated.skills);
            setSavedItemIds(demoHydrated.savedItemIds);
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile, hydrateDemoState]);

  const refreshProfile = useCallback(async (explicitUser?: User | null) => {
    try {
      if (explicitUser?.id) {
        setUser(explicitUser);
        await loadUserProfile(explicitUser);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user);
        return;
      }
    } catch (e) {
      console.warn("refreshProfile note:", e);
    }

    const isDemoActive = typeof window !== "undefined" && localStorage.getItem("edusphere_demo_active") === "true";
    if (isDemoActive) {
      const demoHydrated = hydrateDemoState();
      if (demoHydrated) {
        setUser(demoHydrated.user);
        setProfile(demoHydrated.profile);
        setStudentProfile(demoHydrated.studentProfile);
        setSkills(demoHydrated.skills);
        setSavedItemIds(demoHydrated.savedItemIds);
      }
    }
  }, [hydrateDemoState, supabase, loadUserProfile]);

  // Demo Login
  const loginDemo = useCallback(async (email: string, fullName?: string) => {
    setLoading(true);
    try {
      const demoUser = {
        id: "demo-user-123",
        email: email.trim(),
        user_metadata: { full_name: fullName || "Sujal Sonkusare" },
      } as unknown as User;

      const demoProf: Profile = {
        id: "demo-user-123",
        full_name: fullName || defaultDemoProfile.profile.full_name,
        role: "student",
      };

      const demoSP: StudentProfile = {
        id: "sp-demo-001",
        profile_id: "demo-user-123",
        preferred_branch: defaultDemoProfile.studentProfile.preferred_branch,
        entrance_score: defaultDemoProfile.studentProfile.entrance_score,
        preferred_location: defaultDemoProfile.studentProfile.preferred_location,
        cgpa: defaultDemoProfile.studentProfile.cgpa,
      };

      const demoSk = [...defaultDemoProfile.skills];
      const demoSaved = new Set<string>(["col-1", "int-1", "plc-1"]);

      setUser(demoUser);
      setProfile(demoProf);
      setStudentProfile(demoSP);
      setSkills(demoSk);
      setSavedItemIds(demoSaved);

      if (typeof window !== "undefined") {
        localStorage.setItem("edusphere_demo_active", "true");
      }
      persistDemoState(demoUser, demoProf, demoSP, demoSk, demoSaved);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [persistDemoState]);

  // Demo Signup
  const signupDemo = useCallback(async (fullName: string, email: string) => {
    setLoading(true);
    try {
      const demoUser = {
        id: `demo-${Date.now()}`,
        email: email.trim(),
        user_metadata: { full_name: fullName.trim() },
      } as unknown as User;

      const demoProf: Profile = {
        id: demoUser.id,
        full_name: fullName.trim(),
        role: "student",
      };

      const demoSP: StudentProfile = {
        id: `sp-${Date.now()}`,
        profile_id: demoUser.id,
        preferred_branch: "Computer Science & Engineering",
        entrance_score: 95.0,
        preferred_location: "Maharashtra",
        cgpa: 8.0,
        career_goal: "Full Stack Developer",
      };

      const demoSk = ["Python", "React", "JavaScript"];
      const demoSaved = new Set<string>(["col-1"]);

      setUser(demoUser);
      setProfile(demoProf);
      setStudentProfile(demoSP);
      setSkills(demoSk);
      setSavedItemIds(demoSaved);

      if (typeof window !== "undefined") {
        localStorage.setItem("edusphere_demo_active", "true");
      }
      persistDemoState(demoUser, demoProf, demoSP, demoSk, demoSaved);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign up";
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [persistDemoState]);

  // Update Profile: Supabase is authoritative source of truth
  const updateProfile = useCallback(async (data: UpdateProfileParams) => {
    try {
      if (!user?.id) {
        return { success: false, error: "No user logged in" };
      }

      const trimmedName = data.fullName.trim();
      const trimmedBranch = data.preferredBranch ? data.preferredBranch.trim() : null;
      const parsedEntranceScore = data.entranceScore !== undefined ? data.entranceScore : null;
      const trimmedLocation = data.preferredLocation ? data.preferredLocation.trim() : null;
      const parsedCgpa = data.cgpa !== undefined && data.cgpa !== null ? Number(data.cgpa) : null;
      const trimmedCareerGoal =
        data.careerGoal !== undefined
          ? (data.careerGoal ? data.careerGoal.trim() : null)
          : null;
      const rawSkills = data.skills !== undefined ? data.skills : skills;
      const updatedSkills = normalizeAndDeduplicateSkills(rawSkills);

      // If demo mode, persist to demo state and exit early
      if (user.id.startsWith("demo-")) {
        const demoProf: Profile = {
          id: user.id,
          full_name: trimmedName,
          role: profile?.role || "student",
          updated_at: new Date().toISOString(),
        };
        const demoSP: StudentProfile = {
          id: studentProfile?.id || "sp-demo-001",
          profile_id: user.id,
          preferred_branch: trimmedBranch,
          entrance_score: parsedEntranceScore,
          preferred_location: trimmedLocation,
          cgpa: parsedCgpa,
          career_goal: trimmedCareerGoal,
          updated_at: new Date().toISOString(),
        };
        setProfile(demoProf);
        setStudentProfile(demoSP);
        setSkills(updatedSkills);
        persistDemoState(user, demoProf, demoSP, updatedSkills, savedItemIds);
        return { success: true };
      }

      // =========================================================================
      // REAL SUPABASE DATABASE PERSISTENCE — SUPABASE IS THE PERMANENT SOURCE OF TRUTH
      // =========================================================================

      // Step A: Sync full_name with Supabase Auth user_metadata
      try {
        await supabase.auth.updateUser({
          data: { full_name: trimmedName },
        });
      } catch (authMetaErr) {
        console.warn("Supabase auth updateUser note:", authMetaErr);
      }

      // Step B: Ensure public.profiles has the parent row (auth.users -> profiles)
      const { data: existingProf, error: profQueryErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profQueryErr) {
        console.error("Error querying profiles table:", profQueryErr);
        throw new Error(`Failed to query user profile: ${profQueryErr.message}`);
      }

      let activeProfile: Profile;
      if (existingProf?.id) {
        const { data: updatedProfData, error: profUpdateErr } = await supabase
          .from("profiles")
          .update({
            full_name: trimmedName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select("*")
          .single();

        if (profUpdateErr) {
          console.error("Error updating profiles row:", profUpdateErr);
          throw new Error(`Failed to update profile: ${profUpdateErr.message}`);
        }
        activeProfile = updatedProfData as Profile;
      } else {
        const { data: newProfData, error: profInsertErr } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: trimmedName,
            role: profile?.role || "student",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (profInsertErr) {
          console.error("Error inserting profiles row:", profInsertErr);
          throw new Error(`Failed to create profile: ${profInsertErr.message}`);
        }
        activeProfile = newProfData as Profile;
      }

      // Step C: Write to public.student_profiles (profiles -> student_profiles)
      // Check if student_profiles row already exists for this profile_id
      const { data: existingSP, error: spQueryErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (spQueryErr) {
        console.error("Error querying student_profiles table:", spQueryErr);
        throw new Error(`Failed to query student profile: ${spQueryErr.message}`);
      }

      let spDbId: string;
      let activeSP: StudentProfile;

      if (existingSP?.id) {
        // UPDATE existing row
        spDbId = existingSP.id;
        const { data: updatedSPData, error: spUpdateErr } = await supabase
          .from("student_profiles")
          .update({
            preferred_branch: trimmedBranch,
            entrance_score: parsedEntranceScore,
            preferred_location: trimmedLocation,
            career_goal: trimmedCareerGoal,
            cgpa: parsedCgpa,
            updated_at: new Date().toISOString(),
          })
          .eq("id", spDbId)
          .select("*")
          .single();

        if (spUpdateErr) {
          console.error("Error updating student_profiles row:", spUpdateErr);
          throw new Error(`Failed to update student academic details: ${spUpdateErr.message}`);
        }
        activeSP = updatedSPData as StudentProfile;
      } else {
        // INSERT exactly one row
        const { data: newSPData, error: spInsertErr } = await supabase
          .from("student_profiles")
          .insert({
            profile_id: user.id,
            preferred_branch: trimmedBranch,
            entrance_score: parsedEntranceScore,
            preferred_location: trimmedLocation,
            career_goal: trimmedCareerGoal,
            cgpa: parsedCgpa,
            updated_at: new Date().toISOString(),
          })
          .select("*")
          .single();

        if (spInsertErr) {
          console.error("Error inserting student_profiles row:", spInsertErr);
          throw new Error(`Failed to create student academic profile: ${spInsertErr.message}`);
        }
        spDbId = newSPData.id;
        activeSP = newSPData as StudentProfile;
      }

      // Step D: Synchronize public.student_skills (student_profiles -> student_skills)
      // 1. Delete all existing skills for this student profile
      const { error: delSkillsErr } = await supabase
        .from("student_skills")
        .delete()
        .eq("student_profile_id", spDbId);

      if (delSkillsErr) {
        console.error("Error deleting student_skills:", delSkillsErr);
        throw new Error(`Failed to update skills: ${delSkillsErr.message}`);
      }

      // 2. Insert new deduplicated skills with NOT NULL proficiency_level
      if (updatedSkills.length > 0) {
        const skillRows = updatedSkills.map((name) => ({
          student_profile_id: spDbId,
          skill_name: name,
          proficiency_level: "intermediate",
        }));

        const { error: insSkillsErr } = await supabase
          .from("student_skills")
          .insert(skillRows);

        if (insSkillsErr) {
          console.error("Error inserting student_skills:", insSkillsErr);
          throw new Error(`Failed to save skills: ${insSkillsErr.message}`);
        }
      }

      // Step E: Update React states ONLY after successful database writes
      setProfile(activeProfile);
      setStudentProfile(activeSP);
      setSkills(updatedSkills);

      // Step F: Update user-scoped localStorage cache as secondary UI cache
      if (typeof window !== "undefined") {
        localStorage.setItem(`edusphere_profile_${user.id}`, JSON.stringify(activeProfile));
        localStorage.setItem(`edusphere_student_profile_${user.id}`, JSON.stringify(activeSP));
        localStorage.setItem(`edusphere_skills_${user.id}`, JSON.stringify(updatedSkills));
      }

      return { success: true };
    } catch (err) {
      console.error("updateProfile failure:", err);
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      return { success: false, error: msg };
    }
  }, [user, profile, studentProfile, skills, savedItemIds, persistDemoState, supabase]);

  const isItemSaved = useCallback((itemId: string) => {
    if (!itemId) return false;
    return (
      savedItemIds.has(itemId) ||
      savedItemIds.has(dbUuidToItemId(itemId)) ||
      savedItemIds.has(itemIdToDbUuid(itemId))
    );
  }, [savedItemIds]);

  const toggleSaveItem = useCallback(async (itemType: "college" | "internship" | "placement", itemId: string): Promise<boolean> => {
    if (!user) {
      router.push("/login");
      return false;
    }

    const normId = dbUuidToItemId(itemId);
    const dbUuid = itemIdToDbUuid(itemId);
    const alreadySaved = savedItemIds.has(itemId) || savedItemIds.has(normId) || savedItemIds.has(dbUuid);
    const prevSaved = new Set(savedItemIds);
    const nextSet = new Set(savedItemIds);
    if (alreadySaved) {
      nextSet.delete(itemId);
      nextSet.delete(normId);
      nextSet.delete(dbUuid);
    } else {
      nextSet.add(normId);
    }

    // 1. Optimistic UI update
    setSavedItemIds(nextSet);

    // Update user-scoped localStorage cache
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`edusphere_saved_${user.id}`, JSON.stringify(Array.from(nextSet)));
        if (user.id.startsWith("demo-")) {
          localStorage.setItem(LS_SAVED_KEY, JSON.stringify(Array.from(nextSet)));
        }
      } catch (e) {
        console.warn("Error persisting saved items to localStorage:", e);
      }
    }

    // If demo session, return immediately
    if (user.id.startsWith("demo-")) {
      return !alreadySaved;
    }

    // 2. Real Supabase Database Operation
    try {
      let activeSpId = studentProfile?.id;
      if (!activeSpId || !isUuid(activeSpId)) {
        const { data: spData } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();
        if (spData?.id) {
          activeSpId = spData.id;
        }
      }

      if (!activeSpId || !isUuid(activeSpId)) {
        throw new Error("Student profile ID not found for current user.");
      }

      const dbUuid = itemIdToDbUuid(itemId);

      if (alreadySaved) {
        // Scoped delete: student_profile_id + item_type + item_id
        const { error: delErr } = await supabase
          .from("saved_items")
          .delete()
          .eq("student_profile_id", activeSpId)
          .eq("item_type", itemType)
          .eq("item_id", dbUuid);

        if (delErr) {
          throw delErr;
        }
      } else {
        // Duplicate check before insert
        const { data: existingRow, error: checkErr } = await supabase
          .from("saved_items")
          .select("id")
          .eq("student_profile_id", activeSpId)
          .eq("item_type", itemType)
          .eq("item_id", dbUuid)
          .maybeSingle();

        if (checkErr) {
          console.warn("Duplicate check query note:", checkErr.message);
        }

        if (!existingRow) {
          const { error: insErr } = await supabase
            .from("saved_items")
            .insert({
              student_profile_id: activeSpId,
              item_type: itemType,
              item_id: dbUuid,
              saved_at: new Date().toISOString(),
            });

          if (insErr && insErr.code !== "23505") {
            throw insErr;
          }
        }
      }

      return !alreadySaved;
    } catch (err) {
      console.error("Supabase toggleSaveItem failed, rolling back optimistic update:", err);
      // Automatic rollback on failure
      setSavedItemIds(prevSaved);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`edusphere_saved_${user.id}`, JSON.stringify(Array.from(prevSaved)));
        } catch (e) {
          console.warn("Error rolling back localStorage cache:", e);
        }
      }
      return alreadySaved;
    }
  }, [user, studentProfile, savedItemIds, supabase, router]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (user?.id.startsWith("demo-")) return null;

    try {
      // 1. Get current session from Supabase
      const { data: { session: currentSession }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        console.warn("[AuthContext] getSession note:", sessErr.message);
      }

      // 2. Check if access token is present and valid (with 60s buffer)
      if (currentSession?.access_token) {
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAt = currentSession.expires_at;
        if (!expiresAt || expiresAt > nowSec + 60) {
          setSession(currentSession);
          return currentSession.access_token;
        }
      }

      // 3. Token is expired or expiring within 60s -> refresh session
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        setSession(refreshData.session);
        if (refreshData.session.user) {
          setUser(refreshData.session.user);
        }
        return refreshData.session.access_token;
      }

      // 4. Fallback to existing token
      if (currentSession?.access_token) {
        return currentSession.access_token;
      }

      return session?.access_token || null;
    } catch (err) {
      console.warn("[AuthContext] getAccessToken exception:", err);
      return session?.access_token || null;
    }
  }, [user, supabase, session]);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[AuthContext] refreshSession error:", error.message);
        return null;
      }
      if (data.session) {
        setSession(data.session);
        if (data.session.user) {
          setUser(data.session.user);
        }
        return data.session;
      }
      return null;
    } catch (err) {
      console.warn("[AuthContext] refreshSession exception:", err);
      return null;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out note:", e);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setStudentProfile(null);
    setSkills([]);
    setSavedItemIds(new Set());

    if (typeof window !== "undefined") {
      localStorage.removeItem("edusphere_demo_active");
      localStorage.removeItem(LS_USER_KEY);
      localStorage.removeItem(LS_PROFILE_KEY);
      localStorage.removeItem(LS_STUDENT_PROFILE_KEY);
      localStorage.removeItem(LS_SKILLS_KEY);
      localStorage.removeItem(LS_SAVED_KEY);
    }
    router.push("/login");
  }, [supabase, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        studentProfile,
        skills,
        savedItemIds,
        loading,
        getAccessToken,
        refreshSession,
        refreshProfile,
        updateProfile,
        toggleSaveItem,
        isItemSaved,
        loginDemo,
        signupDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
