"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { LoadingPage } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { AlertCircle, ArrowLeft, ExternalLink } from "@/components/icons";
import { SaveButton } from "@/components/pune/SaveButton";
import { SourceNote } from "@/components/pune/SourceNote";
import { ProgrammeCard } from "@/components/pune/ProgrammeCard";
import { createClient } from "@/lib/supabase/client";
import { getCollege, getCollegeRelated } from "@/lib/pune/queries";
import { display, displayInr, displayNumber, NOT_AVAILABLE, present, safeUrl } from "@/lib/pune/format";
import type { CollegeRelated, PuneCollege } from "@/lib/pune/types";

export default function PuneCollegeDetailClient() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [college, setCollege] = useState<PuneCollege | null>(null);
  const [related, setRelated] = useState<CollegeRelated | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      try {
        const c = await getCollege(supabase, id);
        if (!active) return;
        if (!c) {
          setState("missing");
          return;
        }
        setCollege(c);
        const r = await getCollegeRelated(supabase, c);
        if (!active) return;
        setRelated(r);
        setState("ready");
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
        setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") return <LoadingPage />;

  if (state === "missing" || state === "error" || !college || !related) {
    return (
      <DashboardShell title="College details">
        {state === "error" && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" /> Could not load this college: {error}
          </div>
        )}
        <EmptyState
          title="College not found"
          description="This college is not in the EduSphere database."
          actionText="Back to colleges"
          actionHref="/colleges"
        />
      </DashboardShell>
    );
  }

  const website = safeUrl(college.official_website);
  const admissionUrl = safeUrl(college.admission_url);

  return (
    <DashboardShell>
      <Link href="/colleges" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-3.5 h-3.5" /> All colleges
      </Link>

      <section className="p-5 sm:p-6 bg-white border border-[#EAEAEA] rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{college.college_name_as_published}</h1>
            {present(college.short_name) && <p className="text-sm text-slate-500">{college.short_name}</p>}
            <p className="text-sm text-slate-600">{display(college.address_as_published)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/compare?ids=${college.id}`}
              className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#EAEAEA] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Compare
            </Link>
            <SaveButton kind="college" itemId={college.id} />
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <Item label="District" value={college.district} />
          <Item label="Taluka" value={college.taluka} />
          <Item label="City" value={college.city} />
          <Item label="PIN code" value={college.pin_code} />
          <Item label="Affiliating university" value={college.affiliating_university} />
          <Item label="Institution type" value={college.institution_type} />
          <Item label="Ownership" value={college.ownership} />
          <Item label="Autonomous status" value={college.autonomous_status} />
          <Item label="Established" value={college.established_year} />
          <Item label="NAAC grade" value={college.naac_grade} />
          <Item label="NAAC CGPA" value={college.naac_cgpa} />
          <Item label="NAAC cycle year" value={college.naac_cycle_year} />
          <Item label="NAAC valid until" value={college.naac_valid_until} />
          <Item label="NIRF rank (latest)" value={college.nirf_rank_latest} />
          <Item label="NIRF year" value={college.nirf_year} />
          <Item label="AISHE code" value={college.aishe_code} />
          <Item label="DTE code" value={college.dte_code} />
          <Item label="DHE code" value={college.dhe_code} />
          <Item label="Email" value={college.email} />
          <Item label="Phone" value={college.phone} />
          <LinkItem label="Official website" url={website} />
          <LinkItem label="Admission page" url={admissionUrl} />
        </dl>

        <SourceNote sourceUrl={college.source_url} retrievedDate={college.retrieved_date} />
      </section>

      <Section title="Programmes" count={related.programmes.length} empty="No programmes are recorded for this college.">
        <div className="grid gap-3 md:grid-cols-2">
          {related.programmes.map((p) => (
            <ProgrammeCard key={p.id} programme={p} showCollege={false} />
          ))}
        </div>
      </Section>

      <Section title="Fees" count={related.fees.length} empty="No fee data is recorded for this college.">
        <Table
          head={["Programme", "Year", "Category", "Tuition", "Development", "Other", "Total / year", "Hostel", "Source"]}
          rows={related.fees.map((f) => [
            programmeLabel(f.programme_degree, f.specialisation),
            display(f.academic_year),
            display(f.fee_category),
            displayInr(f.tuition_fee_inr),
            displayInr(f.development_fee_inr),
            displayInr(f.other_compulsory_fee_inr),
            displayInr(f.total_annual_fee_inr),
            displayInr(f.hostel_fee_inr),
            <SourceLink key="s" url={f.source_url} date={f.retrieved_date} />,
          ])}
        />
      </Section>

      <Section title="Admissions" count={related.admissions.length} empty="No admission data is recorded for this college.">
        <div className="grid gap-3 md:grid-cols-2">
          {related.admissions.map((a) => (
            <div key={a.id} className="p-4 bg-white border border-[#EAEAEA] rounded-2xl text-sm space-y-2">
              <p className="font-semibold text-slate-900">{programmeLabel(a.programme_degree, a.specialisation)}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <Item label="Academic year" value={a.academic_year} />
                <Item label="Admission route" value={a.admission_route} />
                <Item label="Entrance exam" value={a.entrance_exam} />
                <Item label="Admission authority" value={a.admission_authority} />
                <Item label="Eligibility" value={a.eligibility} />
                <Item label="Required subjects" value={a.required_subjects} />
                <Item label="Minimum marks (%)" value={a.minimum_marks_percent} />
                <Item label="Other eligibility" value={a.other_eligibility} />
                <Item label="Important dates" value={a.important_dates} />
                <LinkItem label="Apply at" url={safeUrl(a.application_url)} />
              </dl>
              <SourceNote sourceUrl={a.source_url} retrievedDate={a.retrieved_date} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Cutoffs"
        count={related.cutoffs.length}
        empty="No cutoff data is recorded for this college in the EduSphere database yet."
      >
        <Table
          head={["Programme", "Exam", "Year", "Round", "Category", "Quota", "Seat type", "Cutoff", "Source"]}
          rows={related.cutoffs.map((c) => [
            programmeLabel(c.programme_degree, c.specialisation),
            display(c.exam),
            display(c.academic_year),
            display(c.round),
            display(c.category),
            display(c.quota),
            display(c.seat_type),
            cutoffLabel(c.cutoff_type, c.cutoff_value, c.cutoff_unit),
            <SourceLink key="s" url={c.source_url} date={c.retrieved_date} />,
          ])}
        />
      </Section>

      <Section title="Accreditations and approvals" count={related.accreditations.length} empty="No accreditation records for this college.">
        <Table
          head={["Body", "Record", "Grade", "Status", "Programme", "Valid from", "Valid to", "Source"]}
          rows={related.accreditations.map((a) => [
            display(a.body),
            display(a.record_type),
            display(a.grade),
            display(a.status),
            display(a.programme_degree),
            display(a.valid_from),
            display(a.valid_to),
            <SourceLink key="s" url={a.source_url} date={a.retrieved_date} />,
          ])}
        />
      </Section>

      <Section title="Facilities" count={related.facilities.length} empty="No facility records for this college.">
        <Table
          head={["Facility", "Description", "Capacity", "Source"]}
          rows={related.facilities.map((f) => [
            display(f.facility_type),
            display(f.description),
            displayNumber(f.capacity),
            <SourceLink key="s" url={f.source_url} date={f.retrieved_date} />,
          ])}
        />
      </Section>

      <Section title="Scholarships" count={related.scholarships.length} empty="No scholarship records for this college.">
        <Table
          head={["Scholarship", "Provider", "Eligibility", "Category", "Benefit", "Source"]}
          rows={related.scholarships.map((s) => [
            display(s.name),
            display(s.provider),
            display(s.eligibility),
            display(s.category),
            display(s.benefit),
            <SourceLink key="s" url={s.source_url} date={s.retrieved_date} />,
          ])}
        />
      </Section>
    </DashboardShell>
  );
}

function programmeLabel(degree: string | null, spec: string | null): string {
  const d = present(degree);
  const s = present(spec);
  if (d && s) return `${d} (${s})`;
  return d ?? s ?? NOT_AVAILABLE;
}

function cutoffLabel(type: string | null, value: string | null, unit: string | null): string {
  const v = present(value);
  if (!v) return NOT_AVAILABLE;
  const t = present(type);
  const u = present(unit);
  return [v, u ? `(${u.replace(/_/g, " ")})` : null, t ? `– ${t}` : null].filter(Boolean).join(" ");
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  const text = display(value);
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`break-words ${text === NOT_AVAILABLE ? "text-slate-400 italic" : "text-slate-800"}`}>{text}</dd>
    </div>
  );
}

function LinkItem({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-indigo-600 hover:underline break-all">
            {new URL(url).hostname} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-slate-400 italic">{NOT_AVAILABLE}</span>
        )}
      </dd>
    </div>
  );
}

function SourceLink({ url, date }: { url: string | null; date: string | null }) {
  const safe = safeUrl(url);
  return (
    <span className="whitespace-nowrap">
      {safe ? (
        <a href={safe} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-600 hover:underline">
          Link
        </a>
      ) : (
        NOT_AVAILABLE
      )}
      <span className="block text-[10px] text-slate-400">{display(date)}</span>
    </span>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-900">
        {title} <span className="text-xs font-medium text-slate-400">({count})</span>
      </h2>
      {count === 0 ? <p className="p-4 bg-white border border-[#EAEAEA] rounded-2xl text-sm text-slate-500">{empty}</p> : children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto bg-white border border-[#EAEAEA] rounded-2xl">
      <table className="min-w-full text-xs">
        <thead className="bg-[#FAFAFA] text-left text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EAEAEA]">
          {rows.map((cells, i) => (
            <tr key={i} className="align-top">
              {cells.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${cell === NOT_AVAILABLE ? "text-slate-400 italic" : "text-slate-700"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
