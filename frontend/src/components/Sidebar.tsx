"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearAuth, getRole } from "@/lib/api";
import {
  LayoutDashboard, Briefcase, FileText, Users, Trophy,
  Search, UserCircle, LogOut, ChevronRight, Menu, X
} from "lucide-react";
import { useState, useEffect } from "react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Post Jobs", icon: Briefcase },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/results", label: "Test Results", icon: Trophy },
];

const candidateNav = [
  { href: "/jobs", label: "Browse Jobs", icon: Search },
  { href: "/dashboard", label: "My Applications", icon: FileText },
  { href: "/profile", label: "My Profile", icon: UserCircle },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRole(getRole());
    setMounted(true);
  }, []);

  const nav = mounted && role === "admin" ? adminNav : candidateNav;

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href={mounted && role === "admin" ? "/admin" : "/jobs"} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-sm">
            <Briefcase size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">
            Talent<span className="text-orange-500">Gear</span>
          </span>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3 border-b border-gray-100">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          mounted && role === "admin"
            ? "bg-orange-100 text-orange-700"
            : "bg-blue-100 text-blue-700"
        }`}>
          {mounted && role === "admin" ? "Admin Panel" : "Candidate Portal"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && href !== "/jobs" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(p => !p)}
        className="fixed top-4 left-4 z-50 md:hidden w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — mobile */}
      <aside className={`fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 shadow-lg z-40 transition-transform duration-200 md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
      </aside>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 z-30">
        {sidebarContent}
      </aside>
    </>
  );
}
