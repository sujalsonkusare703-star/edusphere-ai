"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardShell } from "@/components/DashboardShell";
import { CollegeCard } from "@/components/CollegeCard";
import { InternshipCard } from "@/components/InternshipCard";
import { PlacementCard } from "@/components/PlacementCard";
import { LoadingGrid } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { SavedItem, College, Internship, Placement } from "@/types";
import { demoColleges, demoInternships, demoPlacements } from "@/lib/demo-data";
import {
  Bookmark,
  Building2,
  Briefcase,
  Award,
  AlertCircle,
} from "@/components/icons";
import { dbUuidToItemId } from "@/lib/supabase/db-helpers";
import { mapDatabaseCollege, mapDatabaseInternship, mapDatabasePlacement } from "@/lib/supabase/opportunities";

function getDemoItemForId(id: string, studentProfileId: string = "sp-demo-001"): SavedItem | null {
  const normalId = dbUuidToItemId(id);
  const col = demoColleges.find((c) => c.id === id || c.id === normalId);
  if (col) {
    return {
      id: `saved-${col.id}`,
      student_profile_id: studentProfileId,
      item_type: "college",
      item_id: col.id,
      saved_at: new Date().toISOString(),
      college: col,
    };
  }
  const int = demoInternships.find((i) => i.id === id || i.id === normalId);
  if (int) {
    return {
      id: `saved-${int.id}`,
      student_profile_id: studentProfileId,
      item_type: "internship",
      item_id: int.id,
      saved_at: new Date().toISOString(),
      internship: int,
    };
  }
  const plc = demoPlacements.find((p) => p.id === id || p.id === normalId);
  if (plc) {
    return {
      id: `saved-${plc.id}`,
      student_profile_id: studentProfileId,
      item_type: "placement",
      item_id: plc.id,
      saved_at: new Date().toISOString(),
      placement: plc,
    };
  }
  return null;
}

export default function SavedPage() {
  const { studentProfile, savedItemIds } = useAuth();
  const supabase = createClient();

  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "college" | "internship" | "placement">("all");
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedItems() {
      try {
        let populated: SavedItem[] = [];

        // 1. Try fetching from Supabase if studentProfile exists
        if (studentProfile?.id && !studentProfile.id.startsWith("sp-demo")) {
          const { data: rawSaved, error: sErr } = await supabase
            .from("saved_items")
            .select("*")
            .eq("student_profile_id", studentProfile.id)
            .order("saved_at", { ascending: false });

          if (!sErr && rawSaved && rawSaved.length > 0) {
            const collegeIds = rawSaved.filter((i) => i.item_type === "college").map((i) => i.item_id);
            const internshipIds = rawSaved.filter((i) => i.item_type === "internship").map((i) => i.item_id);
            const placementIds = rawSaved.filter((i) => i.item_type === "placement").map((i) => i.item_id);

            const collegesMap: Record<string, College> = {};
            if (collegeIds.length > 0) {
              const { data: cData } = await supabase.from("colleges").select("*").in("id", collegeIds);
              if (cData) {
                cData.forEach((c) => {
                  collegesMap[c.id] = mapDatabaseCollege(c);
                });
              }
            }

            const internshipsMap: Record<string, Internship> = {};
            if (internshipIds.length > 0) {
              const { data: iData } = await supabase.from("internships").select("*").in("id", internshipIds);
              const { data: iSkills } = await supabase
                .from("internship_skills")
                .select("internship_id, skill_name")
                .in("internship_id", internshipIds);

              if (iData) {
                iData.forEach((item) => {
                  const sList = iSkills
                    ? iSkills.filter((s) => s.internship_id === item.id).map((s) => s.skill_name)
                    : [];
                  internshipsMap[item.id] = mapDatabaseInternship(item, sList);
                });
              }
            }

            const placementsMap: Record<string, Placement> = {};
            if (placementIds.length > 0) {
              const { data: pData } = await supabase.from("placements").select("*").in("id", placementIds);
              const { data: pSkills } = await supabase
                .from("placement_skills")
                .select("placement_id, skill_name")
                .in("placement_id", placementIds);

              if (pData) {
                pData.forEach((item) => {
                  const sList = pSkills
                    ? pSkills.filter((s) => s.placement_id === item.id).map((s) => s.skill_name)
                    : [];
                  placementsMap[item.id] = mapDatabasePlacement(item, sList);
                });
              }
            }

            populated = rawSaved
              .map((item) => {
                const normalId = dbUuidToItemId(item.item_id);
                return {
                  ...item,
                  item_id: normalId,
                  college: collegesMap[item.item_id] || undefined,
                  internship: internshipsMap[item.item_id] || undefined,
                  placement: placementsMap[item.item_id] || undefined,
                };
              })
              .filter((item) => item.college || item.internship || item.placement);
          }
        } else if (studentProfile?.id?.startsWith("sp-demo")) {
          // Explicit unauthenticated 1-click demo preview session
          savedItemIds.forEach((id) => {
            const demoItem = getDemoItemForId(id, studentProfile.id);
            if (demoItem) populated.push(demoItem);
          });
        }

        if (!isMounted) return;
        setSavedItems(populated);
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load saved items from database";
        console.warn("Supabase saved items load note:", msg);

        if (studentProfile?.id?.startsWith("sp-demo")) {
          const fallbackList: SavedItem[] = [];
          savedItemIds.forEach((id) => {
            const item = getDemoItemForId(id, studentProfile.id);
            if (item) fallbackList.push(item);
          });
          setSavedItems(fallbackList);
        } else {
          setErrorMsg(msg);
          setSavedItems([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSavedItems();

    return () => {
      isMounted = false;
    };
  }, [studentProfile, savedItemIds, supabase, reloadIndex]);

  const handleRetry = () => {
    setLoading(true);
    setErrorMsg("");
    setReloadIndex((prev) => prev + 1);
  };

  // Compute active saved items strictly matching current savedItemIds
  const activeItems = useMemo(() => {
    const isDemoSession = Boolean(studentProfile?.id?.startsWith("sp-demo"));
    if (isDemoSession) {
      const existingIds = new Set(savedItems.map((i) => i.item_id));
      const combined = [...savedItems];
      savedItemIds.forEach((id) => {
        if (!existingIds.has(id)) {
          const demoItem = getDemoItemForId(id, studentProfile?.id);
          if (demoItem) combined.push(demoItem);
        }
      });
      return combined.filter((i) => savedItemIds.has(i.item_id));
    }

    return savedItems.filter((i) => savedItemIds.has(i.item_id));
  }, [savedItems, savedItemIds, studentProfile]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return activeItems;
    return activeItems.filter((i) => i.item_type === activeTab);
  }, [activeItems, activeTab]);

  return (
    <ProtectedRoute>
      <DashboardShell
        title="Saved Opportunities"
        subtitle="Manage and track your bookmarked colleges, internships, and placement drives"
      >
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>Database Error: {errorMsg}</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium transition text-xs shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#EAEAEA] text-xs font-medium">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-sm font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>All Saved ({activeItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("college")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "college"
                ? "bg-slate-900 text-white shadow-sm font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Colleges ({activeItems.filter((i) => i.item_type === "college").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("internship")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "internship"
                ? "bg-slate-900 text-white shadow-sm font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Internships ({activeItems.filter((i) => i.item_type === "internship").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("placement")}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "placement"
                ? "bg-slate-900 text-white shadow-sm font-semibold"
                : "bg-white text-slate-600 border border-[#EAEAEA] hover:bg-slate-50"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Placements ({activeItems.filter((i) => i.item_type === "placement").length})</span>
          </button>
        </div>

        {/* Saved Items Grid */}
        {loading ? (
          <LoadingGrid count={6} />
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              if (item.item_type === "college" && item.college) {
                return <CollegeCard key={item.id} college={item.college} />;
              }
              if (item.item_type === "internship" && item.internship) {
                return <InternshipCard key={item.id} internship={item.internship} />;
              }
              if (item.item_type === "placement" && item.placement) {
                return <PlacementCard key={item.id} placement={item.placement} />;
              }
              return null;
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Bookmark className="w-8 h-8" />}
            title={activeTab === "all" ? "No Saved Items Found" : `No Saved ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}s Found`}
            description={
              activeTab === "all"
                ? "You haven't bookmarked any opportunities yet. Click the bookmark icon on any college, internship, or placement card to save it here."
                : `You haven't bookmarked any ${activeTab}s yet. Browse ${activeTab}s and click the bookmark icon to save them here.`
            }
            actionText={
              activeTab === "all" || activeTab === "college"
                ? "Discover Colleges"
                : activeTab === "internship"
                ? "Explore Internships"
                : "View Placements"
            }
            actionHref={
              activeTab === "all" || activeTab === "college"
                ? "/colleges"
                : activeTab === "internship"
                ? "/internships"
                : "/placements"
            }
          />
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}
