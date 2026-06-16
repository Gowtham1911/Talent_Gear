"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import { Briefcase, MapPin, DollarSign, Clock, Search, ArrowRight } from "lucide-react";

interface Job { id: number; title: string; description: string; location: string; salary_range: string; created_at: string; }

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setFiltered(d); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(jobs.filter(j => j.title.toLowerCase().includes(q) || (j.location || "").toLowerCase().includes(q)));
  }, [search, jobs]);

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="mb-8">
          <h1 className="section-title mb-1">Open Positions</h1>
          <p className="text-gray-500 text-sm">{jobs.length} roles available</p>
        </div>
        <div className="relative mb-8 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search by title or location…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">No jobs found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="card p-5 group cursor-pointer flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Briefcase size={18} className="text-orange-500" />
                  </div>
                  <span className="badge-open">Open</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors mb-1">{job.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3 flex-1">{job.description}</p>
                <div className="space-y-1 border-t border-gray-50 pt-3">
                  {job.location && <p className="text-xs text-gray-400 flex items-center gap-1.5"><MapPin size={11} />{job.location}</p>}
                  {job.salary_range && <p className="text-xs text-gray-400 flex items-center gap-1.5"><DollarSign size={11} />{job.salary_range}</p>}
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock size={11} />{new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-orange-500 font-medium group-hover:gap-2 transition-all">
                  View &amp; Apply <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
