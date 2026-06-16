"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { CheckCircle, XCircle, Users, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface Application {
  id: number; student_email: string; status: string; match_score: number;
  applied_at: string; parsed_data: string | Record<string, unknown>;
}

export default function AdminApplicationsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bulkN, setBulkN] = useState(50);
  const [bulkScore, setBulkScore] = useState(60);
  const [msg, setMsg] = useState("");
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    loadApps();
  }, [jobId, router]);

  function loadApps() {
    apiFetch(`/api/applications/job/${jobId}`).then(r => r.json()).then(setApps).finally(() => setLoading(false));
  }

  async function updateStatus(id: number, status: string) {
    setActing(id);
    const res = await apiFetch(`/api/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    const data = await res.json();
    setMsg(data.message || "Updated");
    loadApps();
    setActing(null);
  }

  async function bulkShortlist() {
    setMsg("Processing…");
    const res = await apiFetch(`/api/applications/job/${jobId}/bulk-shortlist`, {
      method: "POST", body: JSON.stringify({ top_n: bulkN, min_score: bulkScore }),
    });
    const data = await res.json();
    setMsg(data.message);
    loadApps();
  }

  function getParsed(app: Application) {
    try { return typeof app.parsed_data === "string" ? JSON.parse(app.parsed_data) : app.parsed_data; }
    catch { return null; }
  }

  const scoreColor = (s: number) => s >= 75 ? "text-green-600" : s >= 50 ? "text-orange-500" : "text-red-500";

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title mb-1">Applications</h1>
            <p className="text-gray-500 text-sm">{apps.length} candidates · Job #{jobId}</p>
          </div>
        </div>

        {msg && <div className="bg-orange-50 border border-orange-100 text-orange-700 text-sm px-4 py-3 rounded-xl mb-5">{msg}</div>}

        {/* Bulk Shortlist */}
        <div className="card p-5 mb-6 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Zap size={16} className="text-orange-500" /> Bulk Shortlist by AI Score
          </div>
          <div>
            <label className="label text-xs">Top N candidates</label>
            <input type="number" className="input w-24" value={bulkN} onChange={e => setBulkN(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className="label text-xs">Min match score (%)</label>
            <input type="number" className="input w-24" value={bulkScore} onChange={e => setBulkScore(Number(e.target.value))} min={0} max={100} />
          </div>
          <button onClick={bulkShortlist} className="btn-primary flex items-center gap-2">
            <Users size={15} /> Shortlist &amp; Send Links
          </button>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-16 animate-pulse" />)}</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 card">
            <Users size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No applications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map(app => {
              const parsed = getParsed(app);
              const isOpen = expanded === app.id;
              return (
                <div key={app.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-orange-600">
                        {app.student_email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{parsed?.name || app.student_email}</p>
                        <p className="text-xs text-gray-400 truncate">{app.student_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {app.match_score != null && (
                        <span className={`text-sm font-bold ${scoreColor(app.match_score)}`}>{Math.round(app.match_score)}%</span>
                      )}
                      {app.status === "pending" ? (
                        <>
                          <button onClick={() => updateStatus(app.id, "shortlisted")} disabled={acting === app.id}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50">
                            <CheckCircle size={13} /> Shortlist
                          </button>
                          <button onClick={() => updateStatus(app.id, "rejected")} disabled={acting === app.id}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50">
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      ) : (
                        <div>
                          {app.status === "pending" && <span className="badge-pending">Pending</span>}
                          {app.status === "shortlisted" && <span className="badge-shortlisted">Shortlisted</span>}
                          {app.status === "rejected" && <span className="badge-rejected">Rejected</span>}
                          {app.status === "interview_scheduled" && <span className="badge-scheduled">Test Sent</span>}
                        </div>
                      )}
                      <button onClick={() => setExpanded(isOpen ? null : app.id)} className="text-gray-400 hover:text-gray-600 p-1">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded parsed resume */}
                  {isOpen && parsed && (
                    <div className="border-t border-gray-50 px-5 py-4 bg-orange-50/30">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        {parsed.summary && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</p>
                            <p className="text-gray-700 text-xs leading-relaxed">{parsed.summary}</p>
                          </div>
                        )}
                        {parsed.skills?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</p>
                            <div className="flex flex-wrap gap-1.5">
                              {parsed.skills.map((s: string) => (
                                <span key={s} className="bg-white border border-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {parsed.match_reasons?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Match Reasons</p>
                            <ul className="space-y-1">
                              {parsed.match_reasons.map((r: string) => (
                                <li key={r} className="text-xs text-gray-600 flex items-start gap-1.5">
                                  <CheckCircle size={11} className="text-green-500 mt-0.5 shrink-0" />{r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
