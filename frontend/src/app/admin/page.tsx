"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Briefcase, Users, FileText, TrendingUp, ArrowRight, Plus } from "lucide-react";

interface Job { id: number; title: string; status: string; application_count: number; created_at: string; }

export default function AdminDashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    apiFetch("/api/jobs/admin/all").then(r => r.json()).then(setJobs).finally(() => setLoading(false));
  }, [router]);

  const totalApps = jobs.reduce((s, j) => s + (j.application_count || 0), 0);
  const openJobs = jobs.filter(j => j.status === "open").length;

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title mb-1">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage jobs and candidates</p>
          </div>
          <Link href="/admin/jobs" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Post a Job
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Jobs", value: jobs.length, icon: Briefcase, color: "bg-orange-50 text-orange-500" },
            { label: "Open Roles", value: openJobs, icon: TrendingUp, color: "bg-emerald-50 text-emerald-500" },
            { label: "Applications", value: totalApps, icon: FileText, color: "bg-blue-50 text-blue-500" },
            { label: "Candidates", value: totalApps, icon: Users, color: "bg-purple-50 text-purple-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Recent Jobs */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
              Manage all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No jobs posted yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(job.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{job.application_count} applicants</span>
                    {job.status === "open" ? <span className="badge-open">Open</span> : <span className="badge-closed">Closed</span>}
                    <Link href={`/admin/applications/${job.id}`} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
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
