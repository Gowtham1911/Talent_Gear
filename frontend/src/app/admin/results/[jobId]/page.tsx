"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Trophy, Clock, CheckCircle, XCircle, ChevronRight, Mail } from "lucide-react";

interface Attempt {
  id: number; student_email: string; score: number; status: string;
  round2_status: string; started_at: string; completed_at: string;
  parsed_data: string | Record<string, unknown>;
}

export default function AdminResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    load();
  }, [jobId, router]);

  function load() {
    setLoading(true);
    apiFetch(`/api/assessments/job/${jobId}/results`)
      .then(r => r.json()).then(setAttempts).finally(() => setLoading(false));
  }

  function getName(a: Attempt) {
    try {
      const p = typeof a.parsed_data === "string" ? JSON.parse(a.parsed_data) : a.parsed_data;
      return p?.name || a.student_email;
    } catch { return a.student_email; }
  }

  async function shortlistRound2(id: number) {
    setActing(id);
    const res = await apiFetch(`/api/assessments/attempt/${id}/shortlist-round2`, { method: "POST" });
    const data = await res.json();
    setMsg(data.message);
    load();
    setActing(null);
  }

  async function reject(id: number) {
    setActing(id);
    const res = await apiFetch(`/api/assessments/attempt/${id}/reject`, { method: "POST" });
    const data = await res.json();
    setMsg(data.message);
    load();
    setActing(null);
  }

  const scoreColor = (s: number) =>
    s >= 75 ? "text-green-700 bg-green-50 border-green-200" :
    s >= 50 ? "text-orange-700 bg-orange-50 border-orange-200" :
              "text-red-700 bg-red-50 border-red-200";

  const completed = attempts.filter(a => a.status === "completed");
  const avgScore = completed.length ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length) : 0;
  const shortlisted = attempts.filter(a => a.round2_status === "shortlisted").length;

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="mb-6">
          <h1 className="section-title mb-1">Round 1 Results</h1>
          <p className="text-gray-500 text-sm">Job #{jobId} · {attempts.length} candidates</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Completed", value: completed.length, color: "text-gray-900" },
            { label: "Avg Score", value: `${avgScore}%`, color: "text-orange-600" },
            { label: "Shortlisted R2", value: shortlisted, color: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {msg && (
          <div className="bg-orange-50 border border-orange-100 text-orange-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
            <Mail size={15} /> {msg}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse" />)}</div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-16 card">
            <Trophy size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No assessments completed yet</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {/* Table header */}
            <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Candidate</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-2">Test Status</div>
              <div className="col-span-2">Round 2</div>
              <div className="col-span-2">Actions</div>
            </div>

            {attempts.map((a, i) => (
              <div key={a.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                {/* Rank */}
                <div className="col-span-1">
                  <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-xs font-bold text-orange-600">
                    {i + 1}
                  </div>
                </div>

                {/* Candidate */}
                <div className="col-span-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{getName(a)}</p>
                  <p className="text-xs text-gray-400 truncate">{a.student_email}</p>
                </div>

                {/* Score */}
                <div className="col-span-2">
                  {a.score != null ? (
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${scoreColor(a.score)}`}>
                      {Math.round(a.score)}%
                    </span>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                </div>

                {/* Test status */}
                <div className="col-span-2">
                  {a.status === "completed" ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle size={12} /> Completed
                    </span>
                  ) : a.status === "in_progress" ? (
                    <span className="flex items-center gap-1 text-xs text-orange-500">
                      <Clock size={12} /> In Progress
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                  {a.completed_at && (
                    <p className="text-xs text-gray-300 mt-0.5">{new Date(a.completed_at).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Round 2 status */}
                <div className="col-span-2">
                  {a.round2_status === "shortlisted" && (
                    <span className="badge-shortlisted flex items-center gap-1"><ChevronRight size={11} />Round 2</span>
                  )}
                  {a.round2_status === "rejected" && (
                    <span className="badge-rejected">Rejected</span>
                  )}
                  {(!a.round2_status || a.round2_status === "pending") && a.status === "completed" && (
                    <span className="text-xs text-gray-400">Awaiting decision</span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center gap-2">
                  {a.status === "completed" && (!a.round2_status || a.round2_status === "pending") && (
                    <>
                      <button
                        onClick={() => shortlistRound2(a.id)}
                        disabled={acting === a.id}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50"
                      >
                        <CheckCircle size={12} /> {acting === a.id ? "…" : "Shortlist"}
                      </button>
                      <button
                        onClick={() => reject(a.id)}
                        disabled={acting === a.id}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 text-red-500 border-red-200 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={12} /> {acting === a.id ? "…" : "Reject"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
