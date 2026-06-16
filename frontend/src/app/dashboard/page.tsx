"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import {
  FileText, Clock, CheckCircle, XCircle, Calendar,
  Briefcase, Star, Trophy, ArrowRight, MapPin, TrendingUp
} from "lucide-react";

interface App {
  id: number; job_title: string; location: string;
  status: string; match_score: number; applied_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:             { label: "Under Review",       color: "bg-gray-100 text-gray-600",     icon: <Clock size={13} className="text-gray-400" /> },
  shortlisted:         { label: "Shortlisted",        color: "bg-emerald-50 text-emerald-700",icon: <CheckCircle size={13} className="text-emerald-500" /> },
  rejected:            { label: "Not Selected",       color: "bg-red-50 text-red-600",        icon: <XCircle size={13} className="text-red-400" /> },
  interview_scheduled: { label: "Test Scheduled",     color: "bg-orange-50 text-orange-700",  icon: <Calendar size={13} className="text-orange-500" /> },
};

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    apiFetch("/api/applications/my").then(r => r.json()).then(setApps).finally(() => setLoading(false));
  }, [router]);

  const counts = {
    total:       apps.length,
    shortlisted: apps.filter(a => a.status === "shortlisted").length,
    interviews:  apps.filter(a => a.status === "interview_scheduled").length,
    pending:     apps.filter(a => a.status === "pending").length,
  };

  const stats = [
    { label: "Total Applied",   value: counts.total,       icon: Briefcase,    color: "bg-blue-50 text-blue-500" },
    { label: "Shortlisted",     value: counts.shortlisted,  icon: Star,         color: "bg-emerald-50 text-emerald-500" },
    { label: "Tests Scheduled", value: counts.interviews,   icon: Trophy,       color: "bg-purple-50 text-purple-500" },
    { label: "Under Review",    value: counts.pending,      icon: TrendingUp,   color: "bg-orange-50 text-orange-500" },
  ];

  return (
    <SidebarLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title mb-1">My Applications</h1>
            <p className="text-gray-500 text-sm">Track your job application pipeline</p>
          </div>
          <Link href="/jobs" className="btn-primary flex items-center gap-2 text-sm">
            Browse Jobs <ArrowRight size={14} />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Applications list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="card text-center py-20">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No applications yet</p>
            <p className="text-gray-400 text-sm mb-5">Start applying to open positions</p>
            <Link href="/jobs" className="btn-primary inline-flex">Browse Jobs</Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Application History</h2>
              <span className="text-xs text-gray-400">{apps.length} application{apps.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {apps.map(app => {
                const cfg = STATUS_MAP[app.status] || STATUS_MAP.pending;
                return (
                  <div key={app.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                        <Briefcase size={17} className="text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{app.job_title}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {app.location && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <MapPin size={10} /> {app.location}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {app.match_score != null && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${app.match_score >= 80 ? "bg-emerald-50 text-emerald-600" : app.match_score >= 60 ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-500"}`}>
                              {Math.round(app.match_score)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {cfg.icon}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
