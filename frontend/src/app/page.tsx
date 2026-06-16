"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Briefcase, Zap, Shield, ArrowRight, MapPin, DollarSign, Clock } from "lucide-react";

interface Job { id: number; title: string; location: string; salary_range: string; created_at: string; }

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    apiFetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#fffbf7]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50 pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap size={12} /> AI-Powered Recruitment Platform
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6 tracking-tight">
            Hire Smarter with<br />
            <span className="text-orange-500">AI-Driven</span> Screening
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            TalentGear automates resume parsing, candidate scoring, and Round 1 assessments — so you focus on the best talent.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/jobs" className="btn-primary flex items-center justify-center gap-2 text-base px-7 py-3">
              Browse Open Roles <ArrowRight size={16} />
            </Link>
            <Link href="/register" className="btn-secondary flex items-center justify-center gap-2 text-base px-7 py-3">
              Create Account
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[["500+", "Candidates"], ["3", "Interview Rounds"], ["AI", "Resume Parsing"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-orange-500">{val}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">How TalentGear Works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Briefcase, title: "Post a Job", desc: "Admin posts a role. AI instantly generates a tailored Round 1 assessment with aptitude + DSA questions.", color: "bg-orange-50 text-orange-500" },
            { icon: Zap, title: "AI Resume Parsing", desc: "Every resume is parsed and scored against the job description. Top candidates are surfaced automatically.", color: "bg-amber-50 text-amber-500" },
            { icon: Shield, title: "Automated Assessment", desc: "Shortlisted candidates receive a unique test link via email. Results are scored instantly.", color: "bg-emerald-50 text-emerald-500" },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card p-6">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Jobs */}
      {jobs.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Open Positions</h2>
            <Link href="/jobs" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="card p-5 group cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Briefcase size={18} className="text-orange-500" />
                  </div>
                  <span className="badge-open">Open</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors mb-2">{job.title}</h3>
                <div className="space-y-1">
                  {job.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />{job.location}</p>}
                  {job.salary_range && <p className="text-xs text-gray-400 flex items-center gap-1"><DollarSign size={11} />{job.salary_range}</p>}
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} />{new Date(job.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
              <Briefcase size={12} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Talent<span className="text-orange-500">Gear</span></span>
          </div>
          <p className="text-xs text-gray-400">© 2024 TalentGear. AI Recruitment Platform.</p>
        </div>
      </footer>
    </div>
  );
}
