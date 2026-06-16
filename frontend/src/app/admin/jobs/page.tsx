"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Plus, Briefcase, ArrowRight, X, Sparkles, Loader2 } from "lucide-react";

interface Job { id: number; title: string; status: string; application_count: number; created_at: string; location: string; }

export default function AdminJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", experience_level: "fresher", description: "", requirements: "", location: "", salary_range: "" });
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!form.title.trim()) { setMsg({ text: "Enter a job title first.", type: "error" }); return; }
    setGenerating(true); setMsg({ text: "Ollama is thinking… this may take 10–20 seconds.", type: "info" });
    try {
      const res = await apiFetch("/api/jobs/generate-description", {
        method: "POST",
        body: JSON.stringify({ title: form.title, experience_level: form.experience_level }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm(p => ({ ...p, description: data.description, requirements: data.requirements }));
        setMsg({ text: "AI generated description and requirements. Review and edit before posting.", type: "success" });
      } else {
        setMsg({ text: data.message || "AI generation failed.", type: "error" });
      }
    } catch {
      setMsg({ text: "Could not reach backend. Is it running?", type: "error" });
    }
    setGenerating(false);
  }

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    loadJobs();
  }, [router]);

  function loadJobs() {
    apiFetch("/api/jobs/admin/all").then(r => r.json()).then(setJobs).finally(() => setLoading(false));
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    const res = await apiFetch("/api/jobs", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: "Job posted! It\'s now live in the candidate portal. AI is generating assessment questions.", type: "success" });
      setForm({ title: "", experience_level: "fresher", description: "", requirements: "", location: "", salary_range: "" });
      setShowForm(false);
      loadJobs();
    } else {
      setMsg({ text: data.message || "Error posting job.", type: "error" });
    }
    setSubmitting(false);
  }

  async function toggleStatus(id: number, current: string) {
    await apiFetch(`/api/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: current === "open" ? "closed" : "open" }) });
    loadJobs();
  }

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title mb-1">Manage Jobs</h1>
            <p className="text-gray-500 text-sm">{jobs.length} total jobs</p>
          </div>
          <button onClick={() => setShowForm(p => !p)} className="btn-primary flex items-center gap-2">
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "Cancel" : "Post Job"}
          </button>
        </div>

        {msg && (
          <div className={`text-sm px-4 py-3 rounded-xl mb-6 border ${
            msg.type === "success" ? "bg-green-50 border-green-100 text-green-700" :
            msg.type === "info"    ? "bg-blue-50 border-blue-100 text-blue-700" :
                                    "bg-red-50 border-red-100 text-red-600"
          }`}>
            {msg.text}
          </div>
        )}

        {/* Post Job Form */}
        {showForm && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-5">New Job Posting</h2>
            <form onSubmit={handlePost} className="space-y-4">
              {/* Row 1: Title + Experience Level + Generate */}
              <div className="grid sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-1">
                  <label className="label">Job Title *</label>
                  <input className="input" placeholder="e.g. Software Engineer" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Experience Level *</label>
                  <select className="input" value={form.experience_level}
                    onChange={e => setForm(p => ({ ...p, experience_level: e.target.value }))}>
                    <option value="fresher">Fresher (0–1 yr)</option>
                    <option value="junior">Junior (1–3 yrs)</option>
                    <option value="mid">Mid-level (3–5 yrs)</option>
                    <option value="senior">Senior (5+ yrs)</option>
                  </select>
                </div>
                <div>
                  <button type="button" onClick={handleGenerate} disabled={generating || !form.title.trim()}
                    className="btn-secondary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                    {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-orange-500" />}
                    {generating ? "Generating…" : "Generate with AI"}
                  </button>
                </div>
              </div>

              {/* Row 2: Location + Salary */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Location</label>
                  <input className="input" placeholder="e.g. Remote / Bangalore" value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Salary Range</label>
                  <input className="input" placeholder="e.g. ₹8–12 LPA" value={form.salary_range}
                    onChange={e => setForm(p => ({ ...p, salary_range: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Job Description *</label>
                  {form.description && <span className="text-xs text-orange-500 flex items-center gap-1"><Sparkles size={11} />AI generated</span>}
                </div>
                <textarea className="input min-h-[110px] resize-y" placeholder="Click Generate with AI or write manually…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Requirements *</label>
                  {form.requirements && <span className="text-xs text-orange-500 flex items-center gap-1"><Sparkles size={11} />AI generated</span>}
                </div>
                <textarea className="input min-h-[110px] resize-y" placeholder="Click Generate with AI or write manually…"
                  value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? "Posting…" : "Post Job"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Jobs Table */}
        <div className="card">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No jobs yet. Post your first job above.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                      <p className="text-xs text-gray-400">{job.location || "—"} · {new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:block">{job.application_count} applicants</span>
                    {job.status === "open" ? <span className="badge-open">Open</span> : <span className="badge-closed">Closed</span>}
                    <button onClick={() => toggleStatus(job.id, job.status)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline hidden sm:block">
                      {job.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <Link href={`/admin/applications/${job.id}`} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                      Review <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
