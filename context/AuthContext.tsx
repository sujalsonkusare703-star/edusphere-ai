"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isUuid, itemIdToDbUuid, dbUuidToItemId, normalizeAndDeduplicateSkills } from "@/lib/supabase/db-helpers";
import { Profile, StudentProfile } from "@/types";
import { isDataLive } from "@/lib/feature-flags";
import {
  AcademicProfile,
  PROFILE_META_KEY,
  readAcademicProfile,
  readFullName,
  sanitizeAcademicProfile,
  toStudentProfile,
} from "@/lib/profile-store";
import { useRouter } from "next/navigation";

export interface UpdateProfileParams {
  fullName: string;
  academic: AcademicProfile;
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keys written by the removed demo mode and the old per-user caches; cleared on sign-out.
const LEGACY_LOCAL_KEYS = [
  "edusphere_demo_active",
  "edusphere_demo_user",
  "edusphere_demo_profile",
  "edusphere_demo_student_profile",
  "edusphere_demo_skills",
  "edusphere_demo_saved_items",
];
const LEGACY_LOCAL_PREFIXES = ["edusphere_profile_", "edusphere_student_profile_", "edusphere_skills_", "edusphere_saved_"];

function clearLegacyLocalStorage() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_LOCAL_KEYS) localStorage.removeItem(key);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && LEGACY_LOCAL_PREFIXES.some((p) => key.startsWith(p))) localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable (private mode); nothing to clear then.
  }
}

/** Old builds wrote these keys to user_metadata but never read them back. */
function readLegacyMetadataPreferences(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    preferred_field: str(meta.preferred_field),
    preferred_degree_level: str(meta.preferred_degree_level),
    preferred_degree: str(meta.preferred_degree),
    preferred_district: str(meta.preferred_district),
  };
}

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
  const loadedUserIdRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);

  const clearUserState = useCallback(() => {
    loadedUserIdRef.current = null;
    setUser(null);
    setSession(null);
    setProfile(null);
    setStudentProfile(null);
    setSkills([]);
    setSavedItemIds(new Set());
  }, []);

  // Loads profile data for the signed-in user. Safe to call repeatedly; concurrent calls are de-duplicated.
  const loadUserProfile = useCallback(async (currentUser: User) => {
    if (!currentUser?.id) return;

    const activePromise = inFlightLoadRef.current.get(currentUser.id);
    if (activePromise) return activePromise;

    const currentLoad = (async () => {
      try {
        // 1. profiles row: the ONLY source of the user's role.
        const { data: dbProfile, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at, updated_at")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (profErr) console.warn("profiles fetch note:", profErr.message);

        const fullName =
          readFullName(currentUser) ||
          (dbProfile?.full_name as string | null) ||
          currentUser.email?.split("@")[0] ||
          "Student";

        const activeProfile: Profile = {
          id: currentUser.id,
          full_name: fullName,
          role: (dbProfile?.role as string | null) ?? "student",
          created_at: (dbProfile?.created_at as string | undefined) ?? currentUser.created_at,
          updated_at: dbProfile?.updated_at as string | undefined,
        };

        // 2. student_profiles row: needed for its id (saved items) and as a fallback
        //    for users who saved their profile before it moved to user_metadata.
        const { data: dbSP, error: spErr } = await supabase
          .from("student_profiles")
          .select("id, profile_id, preferred_branch, entrance_score, preferred_location, career_goal, cgpa, created_at, updated_at")
          .eq("profile_id", currentUser.id)
          .maybeSingle();
        if (spErr) console.warn("student_profiles fetch note:", spErr.message);

        const spBase = {
          id: (dbSP?.id as string | undefined) ?? `sp-${currentUser.id.slice(0, 8)}`,
          profile_id: currentUser.id,
          created_at: dbSP?.created_at as string | undefined,
        };

        let academic = readAcademicProfile(currentUser);
        if (!academic) {
          // Legacy account: build the profile from the old table + old metadata keys.
          // If that table could not be read, fail the load rather than show an empty
          // form whose first save would overwrite the student's old values.
          if (spErr) throw new Error(`Could not load your saved profile: ${spErr.message}`);
          const legacy = readLegacyMetadataPreferences(currentUser);
          let legacySkills: string[] = [];
          if (dbSP?.id && isUuid(dbSP.id as string)) {
            const { data: dbSkills, error: skillsErr } = await supabase
              .from("student_skills")
              .select("skill_name")
              .eq("student_profile_id", dbSP.id);
            if (skillsErr) throw new Error(`Could not load your saved skills: ${skillsErr.message}`);
            legacySkills = normalizeAndDeduplicateSkills((dbSkills ?? []).map((s) => s.skill_name as string));
          }
          academic = sanitizeAcademicProfile({
            specialisation: dbSP?.preferred_branch,
            degree: legacy.preferred_degree,
            preferred_district: legacy.preferred_district ?? dbSP?.preferred_location,
            entrance_score: dbSP?.entrance_score,
            cgpa: dbSP?.cgpa,
            career_goal: dbSP?.career_goal,
            skills: legacySkills,
          });
        }

        // 3. Saved items belong to the data sections; skip the query while they are hidden.
        let loadedSaved = new Set<string>();
        if (isDataLive() && dbSP?.id && isUuid(dbSP.id as string)) {
          const { data: dbSaved, error: savedErr } = await supabase
            .from("saved_items")
            .select("item_id, item_type")
            .eq("student_profile_id", dbSP.id);
          if (!savedErr && dbSaved) {
            loadedSaved = new Set<string>(dbSaved.map((r) => dbUuidToItemId(r.item_id as string)));
          }
        }

        loadedUserIdRef.current = currentUser.id;
        setProfile(activeProfile);
        setStudentProfile(toStudentProfile(academic, spBase));
        setSkills(academic.skills);
        setSavedItemIds(loadedSaved);
      } catch (err) {
        console.warn("Profile load error:", err);
      }
    })();

    inFlightLoadRef.current.set(currentUser.id, currentLoad);
    try {
      await currentLoad;
    } finally {
      inFlightLoadRef.current.delete(currentUser.id);
    }
  }, [supabase]);

  // Supabase Auth is the single source of truth for the session.
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      const currentUser = currentSession?.user ?? null;
      if (!currentUser) {
        clearUserState();
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentUser);

      // Token refreshes and our own profile saves already have current state:
      // reloading here would unmount open forms and flash a loading screen.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      if (loadedUserIdRef.current === currentUser.id) {
        setLoading(false);
        return;
      }

      // Never await Supabase calls inside this callback (supabase-js can deadlock); defer instead.
      setTimeout(() => {
        loadUserProfile(currentUser).finally(() => {
          if (isMounted) setLoading(false);
        });
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile, clearUserState]);

  const refreshProfile = useCallback(async (explicitUser?: User | null) => {
    try {
      let target = explicitUser ?? null;
      if (!target?.id) {
        const { data } = await supabase.auth.getUser();
        target = data.user;
      }
      if (!target?.id) return;
      setUser(target);
      loadedUserIdRef.current = null;
      await loadUserProfile(target);
    } catch (e) {
      console.warn("refreshProfile note:", e);
    }
  }, [supabase, loadUserProfile]);

  /**
   * Saves the whole profile in ONE write (auth user_metadata), so it either fully
   * succeeds or changes nothing. Role is never sent. Afterwards the name and the
   * existing student_profiles columns are copied to their tables (best effort) so
   * the older data features keep working when they are switched back on.
   */
  const updateProfile = useCallback(async (data: UpdateProfileParams) => {
    if (!user?.id) return { success: false, error: "You are signed out. Please sign in again." };
    if (saveInFlightRef.current) return { success: false, error: "A save is already in progress." };

    const fullName = data.fullName.replace(/\s+/g, " ").trim().slice(0, 120);
    if (!fullName) return { success: false, error: "Please enter your full name." };

    saveInFlightRef.current = true;
    try {
      const previous = (user.user_metadata?.[PROFILE_META_KEY] ?? {}) as Record<string, unknown>;
      const academic = sanitizeAcademicProfile({ ...data.academic, updated_at: new Date().toISOString() });

      const { data: updated, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          // Spread keeps any keys a newer build may have added.
          [PROFILE_META_KEY]: { ...previous, ...academic },
        },
      });
      if (error || !updated?.user) {
        return { success: false, error: error?.message || "Could not save your profile. Please try again." };
      }

      const savedUser = updated.user;
      const saved = readAcademicProfile(savedUser) ?? academic;
      setUser(savedUser);
      setProfile((prev) => ({
        id: savedUser.id,
        role: prev?.role ?? "student",
        created_at: prev?.created_at,
        full_name: fullName,
        updated_at: saved.updated_at,
      }));
      setSkills(saved.skills);

      const spId = await mirrorToTables(supabase, savedUser.id, fullName, saved);
      setStudentProfile(
        toStudentProfile(saved, {
          id: spId ?? studentProfile?.id ?? `sp-${savedUser.id.slice(0, 8)}`,
          profile_id: savedUser.id,
          created_at: studentProfile?.created_at,
        })
      );

      return { success: true };
    } catch (err) {
      console.error("updateProfile failure:", err);
      return { success: false, error: "Could not save your profile. Please check your connection and try again." };
    } finally {
      saveInFlightRef.current = false;
    }
  }, [user, studentProfile, supabase]);

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

    // Optimistic UI update, rolled back below on failure.
    setSavedItemIds(nextSet);

    try {
      let activeSpId = studentProfile?.id;
      if (!activeSpId || !isUuid(activeSpId)) {
        const { data: spData } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();
        if (spData?.id) activeSpId = spData.id;
      }

      if (!activeSpId || !isUuid(activeSpId)) {
        throw new Error("Student profile ID not found for current user.");
      }

      if (alreadySaved) {
        const { error: delErr } = await supabase
          .from("saved_items")
          .delete()
          .eq("student_profile_id", activeSpId)
          .eq("item_type", itemType)
          .eq("item_id", dbUuid);
        if (delErr) throw delErr;
      } else {
        const { data: existingRow, error: checkErr } = await supabase
          .from("saved_items")
          .select("id")
          .eq("student_profile_id", activeSpId)
          .eq("item_type", itemType)
          .eq("item_id", dbUuid)
          .maybeSingle();
        if (checkErr) console.warn("Duplicate check query note:", checkErr.message);

        if (!existingRow) {
          const { error: insErr } = await supabase.from("saved_items").insert({
            student_profile_id: activeSpId,
            item_type: itemType,
            item_id: dbUuid,
            saved_at: new Date().toISOString(),
          });
          if (insErr && insErr.code !== "23505") throw insErr;
        }
      }

      return !alreadySaved;
    } catch (err) {
      console.error("toggleSaveItem failed, rolling back optimistic update:", err);
      setSavedItemIds(prevSaved);
      return alreadySaved;
    }
  }, [user, studentProfile, savedItemIds, supabase, router]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session: currentSession }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) console.warn("[AuthContext] getSession note:", sessErr.message);

      // Use the current token unless it expires within 60 seconds.
      if (currentSession?.access_token) {
        const nowSec = Math.floor(Date.now() / 1000);
        const expiresAt = currentSession.expires_at;
        if (!expiresAt || expiresAt > nowSec + 60) {
          return currentSession.access_token;
        }
      }

      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        return refreshData.session.access_token;
      }

      return currentSession?.access_token ?? null;
    } catch (err) {
      console.warn("[AuthContext] getAccessToken exception:", err);
      return null;
    }
  }, [supabase]);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[AuthContext] refreshSession error:", error.message);
        return null;
      }
      if (data.session) {
        setSession(data.session);
        if (data.session.user) setUser(data.session.user);
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
    clearUserState();
    clearLegacyLocalStorage();
    router.push("/login");
  }, [supabase, router, clearUserState]);

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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Copies the saved name and the five legacy student_profiles columns into their
 * tables. Never sends `role`. Failures are logged, not surfaced: the profile itself
 * is already saved in user_metadata, which is what the app reads.
 * Returns the student_profiles id when known.
 */
async function mirrorToTables(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fullName: string,
  academic: AcademicProfile
): Promise<string | null> {
  try {
    const { error: nameErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (nameErr) console.warn("profiles name sync note:", nameErr.message);

    const columns = {
      preferred_branch: academic.specialisation ?? academic.degree,
      entrance_score: academic.entrance_score,
      preferred_location: academic.preferred_district,
      career_goal: academic.career_goal,
      cgpa: academic.cgpa,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findErr } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (findErr) {
      console.warn("student_profiles lookup note:", findErr.message);
      return null;
    }

    if (existing?.id) {
      const { error } = await supabase.from("student_profiles").update(columns).eq("id", existing.id);
      if (error) console.warn("student_profiles sync note:", error.message);
      return existing.id as string;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("student_profiles")
      .insert({ profile_id: userId, ...columns })
      .select("id")
      .single();
    if (insErr) {
      console.warn("student_profiles create note:", insErr.message);
      return null;
    }
    return inserted.id as string;
  } catch (err) {
    console.warn("Profile table sync note:", err);
    return null;
  }
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
