"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getRole, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Trophy, ChevronRight, Users, CheckCircle, Clock } from "lucide-react";

interface JobResult {
  id: number; title: string; status: string;
  total_attempts: number; completed_attempts: number; avg_score: number;
}

export default function AdminResultsIndexPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken() || getRole() !== "admin") { router.push("/login"); return; }
    apiFetch("/api/assessments/jobs-summary")
      .then(r => r.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="mb-8">
          <h1 className="section-title mb-1">Test Results</h1>
          <p className="text-gray-500 text-sm">Round 1 assessment results by job</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-20 animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 card">
            <Trophy size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No assessment results yet</p>
            <p className="text-gray-300 text-xs mt-1">Results appear here once candidates complete their tests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Link key={job.id} href={`/admin/results/${job.id}`}
                className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                    <Trophy size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">{job.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={11} /> {job.total_attempts} invited
                      </span>
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={11} /> {job.completed_attempts} completed
                      </span>
                      {job.completed_attempts > 0 && (
                        <span className="text-xs text-orange-600 font-medium">
                          Avg: {Math.round(job.avg_score)}%
                        </span>
                      )}
                      {job.completed_attempts < job.total_attempts && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {job.total_attempts - job.completed_attempts} pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === "open" ? <span className="badge-open">Open</span> : <span className="badge-closed">Closed</span>}
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
