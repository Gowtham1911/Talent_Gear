"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import {
  Users, Search, Briefcase, Star, Clock, CheckCircle2,
  XCircle, Mail, MapPin, Trophy, ChevronDown, Filter, TrendingUp, Send
} from "lucide-react";

interface Candidate {
  student_id: number;
  email: string;
  name: string;
  skills: string[];
  experience_years: number | null;
  application_id: number;
  status: string;
  match_score: number;
  applied_at: string;
  job_id: number;
  job_title: string;
  location: string;
  test_score: number | null;
  test_status: string | null;
  completed_at: string | null;
  round2_status: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:             { label: "Applied",           color: "bg-gray-100 text-gray-600",       dot: "bg-gray-400" },
  shortlisted:         { label: "Shortlisted",       color: "bg-blue-50 text-blue-700",        dot: "bg-blue-500" },
  interview_scheduled: { label: "Test Sent",         color: "bg-purple-50 text-purple-700",    dot: "bg-purple-500" },
  rejected:            { label: "Rejected",          color: "bg-red-50 text-red-600",          dot: "bg-red-400" },
};

const STAGES = [
  { key: "all",                label: "All Candidates", icon: Users },
  { key: "pending",            label: "Applied",        icon: Clock },
  { key: "shortlisted",        label: "Shortlisted",    icon: Star },
  { key: "interview_scheduled",label: "In Assessment",  icon: Trophy },
  { key: "rejected",           label: "Rejected",       icon: XCircle },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50" : score >= 60 ? "text-orange-600 bg-orange-50" : "text-red-500 bg-red-50";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("all");
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    apiFetch("/api/applications/candidates")
      .then(r => r.json())
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, [router]);

  const jobs = useMemo(() => {
    const map = new Map<number, string>();
    candidates.forEach(c => map.set(c.job_id, c.job_title));
    return Array.from(map.entries());
  }, [candidates]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: candidates.length };
    STAGES.slice(1).forEach(s => { c[s.key] = candidates.filter(x => x.status === s.key).length; });
    return c;
  }, [candidates]);

  const filtered = useMemo(() => {
    return candidates.filter(c => {
      if (stage !== "all" && c.status !== stage) return false;
      if (jobFilter !== "all" && c.job_id !== Number(jobFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.job_title.toLowerCase().includes(q) || (c.skills || []).some(s => s.toLowerCase().includes(q));
      }
      return true;
    });
  }, [candidates, stage, jobFilter, search]);

  const [sending, setSending] = useState<number | null>(null);

  async function sendTestLink(applicationId: number) {
    setSending(applicationId);
    const res = await apiFetch(`/api/applications/${applicationId}/send-test-link`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    if (res.ok) setCandidates(prev => prev.map(c => c.application_id === applicationId ? { ...c, status: "interview_scheduled" } : c));
    setSending(null);
  }

  const toggle = (id: number) => setExpanded(p => p === id ? null : id);

  return (
    <SidebarLayout>
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title mb-1">Candidate Pipeline</h1>
          <p className="text-gray-500 text-sm">Track every candidate across the hiring funnel in real-time</p>
        </div>

        {/* Stage tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STAGES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStage(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                stage === key
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              <Icon size={14} />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${stage === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {counts[key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, skill, or job..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 bg-white"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-orange-400 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Jobs</option>
              {jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No candidates found</p>
              <p className="text-gray-300 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div className="col-span-3">Candidate</div>
                <div className="col-span-3">Applied For</div>
                <div className="col-span-2">ATS Score</div>
                <div className="col-span-2">Test Score</div>
                <div className="col-span-2">Status</div>
              </div>

              {filtered.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                const isOpen = expanded === c.application_id;
                return (
                  <div key={c.application_id}>
                    <div
                      className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-orange-50/30 cursor-pointer transition-colors items-center"
                      onClick={() => toggle(c.application_id)}
                    >
                      {/* Candidate */}
                      <div className="col-span-12 md:col-span-3 flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                            <Mail size={10} /> {c.email}
                          </p>
                        </div>
                      </div>

                      {/* Job */}
                      <div className="col-span-6 md:col-span-3">
                        <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                          <Briefcase size={12} className="text-gray-400 shrink-0" /> {c.job_title}
                        </p>
                        {c.location && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {c.location}
                          </p>
                        )}
                      </div>

                      {/* ATS */}
                      <div className="col-span-3 md:col-span-2">
                        {c.match_score != null ? <ScoreBadge score={Math.round(c.match_score)} /> : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Test score */}
                      <div className="col-span-3 md:col-span-2">
                        {c.test_score != null ? (
                          <div className="flex items-center gap-1.5">
                            <ScoreBadge score={Math.round(c.test_score)} />
                            {c.test_status === "completed" && <CheckCircle2 size={13} className="text-emerald-500" />}
                          </div>
                        ) : c.test_status === "in_progress" ? (
                          <span className="text-xs text-purple-500 font-medium flex items-center gap-1"><Clock size={11} /> In progress</span>
                        ) : (
                          <span className="text-xs text-gray-300">Not taken</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-12 md:col-span-2 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-5 pb-5 bg-orange-50/20 border-t border-orange-100/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          {/* Profile */}
                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Candidate Info</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail size={13} className="text-gray-400" />
                                <a href={`mailto:${c.email}`} className="text-orange-600 hover:underline">{c.email}</a>
                              </div>
                              {c.experience_years != null && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <TrendingUp size={13} className="text-gray-400" />
                                  {c.experience_years} yr{c.experience_years !== 1 ? "s" : ""} experience
                                </div>
                              )}
                              {c.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin size={13} className="text-gray-400" /> {c.location}
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock size={13} className="text-gray-400" />
                                Applied {new Date(c.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            </div>
                          </div>

                          {/* Skills */}
                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Skills</p>
                            {c.skills && c.skills.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {c.skills.slice(0, 12).map((s, i) => (
                                  <span key={i} className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg font-medium border border-orange-100">{s}</span>
                                ))}
                                {c.skills.length > 12 && <span className="text-xs text-gray-400">+{c.skills.length - 12} more</span>}
                              </div>
                            ) : <p className="text-xs text-gray-400">No skills extracted yet</p>}
                          </div>

                          {/* Assessment */}
                          <div className="bg-white rounded-xl p-4 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assessment</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">ATS Match</span>
                                {c.match_score != null ? <ScoreBadge score={Math.round(c.match_score)} /> : <span className="text-xs text-gray-300">Pending</span>}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Round 1 Score</span>
                                {c.test_score != null ? <ScoreBadge score={Math.round(c.test_score)} /> : <span className="text-xs text-gray-300">—</span>}
                              </div>
                              {c.completed_at && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Completed</span>
                                  <span className="text-xs text-gray-600">{new Date(c.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                </div>
                              )}
                              {c.round2_status && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Round 2</span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.round2_status === "shortlisted" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                    {c.round2_status === "shortlisted" ? "✓ Shortlisted" : "✗ Rejected"}
                                  </span>
                                </div>
                              )}
                              {c.status === "rejected" && (
                                <div className="pt-2 border-t border-gray-100 mt-1">
                                  <button
                                    onClick={() => sendTestLink(c.application_id)}
                                    disabled={sending === c.application_id}
                                    className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                                  >
                                    <Send size={12} />
                                    {sending === c.application_id ? "Sending…" : "Send Test Link"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && (
          <p className="text-xs text-gray-400 mt-4 text-right">
            Showing {filtered.length} of {candidates.length} candidates
          </p>
        )}
      </div>
    </SidebarLayout>
  );
}
