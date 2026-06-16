"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, apiFetchForm, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Briefcase, MapPin, DollarSign, Clock, Upload, CheckCircle, AlertCircle } from "lucide-react";

interface Job { id: number; title: string; description: string; requirements: string; location: string; salary_range: string; created_at: string; }

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [details, setDetails] = useState({ name: "", email: "", rollno: "" });

  useEffect(() => {
    apiFetch(`/api/jobs/${id}`).then(r => r.json()).then(setJob).finally(() => setLoading(false));
  }, [id]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!getToken()) { router.push("/login"); return; }
    if (!file) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append("resume", file);
    fd.append("name", details.name);
    fd.append("email", details.email);
    fd.append("rollno", details.rollno);
    try {
      const res = await apiFetchForm(`/api/applications/${id}/apply`, fd);
      const data = await res.json();
      setResult({ ok: res.ok, msg: data.message });
    } catch {
      setResult({ ok: false, msg: "Network error" });
    } finally { setSubmitting(false); }
  }

  if (loading) return (
    <SidebarLayout>
      <div className="page-container"><div className="card p-8 animate-pulse"><div className="h-6 bg-gray-100 rounded w-1/2 mb-4" /><div className="h-4 bg-gray-100 rounded w-full mb-2" /></div></div>
    </SidebarLayout>
  );

  if (!job) return (
    <SidebarLayout>
      <div className="page-container text-center py-20"><p className="text-gray-400">Job not found</p></div>
    </SidebarLayout>
  );

  return (
    <SidebarLayout>
      <div className="page-container max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Briefcase size={22} className="text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {job.location && <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
                    {job.salary_range && <span className="text-xs text-gray-400 flex items-center gap-1"><DollarSign size={11} />{job.salary_range}</span>}
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">About this role</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">Requirements</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.requirements}</p>
                </div>
              </div>
            </div>

            {/* Interview Process */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Interview Process</h2>
              <div className="space-y-3">
                {[
                  { round: "1", label: "AI Resume Screening", desc: "Your resume is parsed and matched to the job. 70%+ match gets a test link." },
                  { round: "2", label: "Aptitude + DSA Assessment", desc: "15 aptitude + 10 DSA MCQs · 60 min · Sent via email or WhatsApp" },
                  { round: "3", label: "HR Interview", desc: "Final round with the hiring team" },
                ].map(({ round, label, desc }) => (
                  <div key={round} className="flex gap-3">
                    <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-orange-600">{round}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Apply Card */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-6">
              <h2 className="font-semibold text-gray-900 mb-4">Apply for this role</h2>
              {result ? (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {result.ok ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                  <p className="text-sm">{result.msg}</p>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-4">
                  {/* Basic Details */}
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" placeholder="Your full name" required
                      value={details.name} onChange={e => setDetails(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Email ID *</label>
                    <input className="input" placeholder="you@example.com" required type="email"
                      value={details.email} onChange={e => setDetails(p => ({ ...p, email: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Test link will be sent to this email</p>
                  </div>
                  <div>
                    <label className="label">Roll No / Registration No</label>
                    <input className="input" placeholder="e.g. 21CS1045"
                      value={details.rollno} onChange={e => setDetails(p => ({ ...p, rollno: e.target.value }))} />
                  </div>

                  {/* Resume Upload */}
                  <div>
                    <label className="label">Resume (PDF, DOC, DOCX) *</label>
                    <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${file ? "border-orange-300 bg-orange-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"}`}>
                      <Upload size={20} className={file ? "text-orange-500" : "text-gray-300"} />
                      <span className="text-xs mt-2 text-center px-2 text-gray-400">
                        {file ? file.name : "Click to upload or drag & drop"}
                      </span>
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx"
                        onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <button type="submit" disabled={!file || submitting || !details.name || !details.email} className="btn-primary w-full justify-center flex">
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">AI will parse your resume. 70%+ match → test link sent</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
