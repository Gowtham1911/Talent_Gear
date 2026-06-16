"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearAuth, getRole } from "@/lib/api";
import { Briefcase, LogOut, LayoutDashboard, Users, FileText } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRole(getRole());
    setMounted(true);
  }, []);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const isActive = (href: string) =>
    pathname === href ? "text-orange-600 font-semibold" : "text-gray-600 hover:text-orange-600";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-orange-600 transition-colors">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">
            Talent<span className="text-orange-500">Gear</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {mounted && (role === "admin" ? (
            <>
              <Link href="/admin" className={`btn-ghost text-sm ${isActive("/admin")}`}>
                <span className="flex items-center gap-1.5"><LayoutDashboard size={15} />Dashboard</span>
              </Link>
              <Link href="/admin/jobs" className={`btn-ghost text-sm ${isActive("/admin/jobs")}`}>
                <span className="flex items-center gap-1.5"><Briefcase size={15} />Jobs</span>
              </Link>
            </>
          ) : role === "student" || role === "employee" ? (
            <>
              <Link href="/jobs" className={`btn-ghost text-sm ${isActive("/jobs")}`}>
                <span className="flex items-center gap-1.5"><Briefcase size={15} />Browse Jobs</span>
              </Link>
              <Link href="/dashboard" className={`btn-ghost text-sm ${isActive("/dashboard")}`}>
                <span className="flex items-center gap-1.5"><FileText size={15} />My Applications</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/jobs" className={`btn-ghost text-sm ${isActive("/jobs")}`}>Browse Jobs</Link>
              <Link href="/login" className={`btn-ghost text-sm ${isActive("/login")}`}>Login</Link>
            </>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {mounted && (role ? (
            <button onClick={logout} className="btn-ghost text-sm flex items-center gap-1.5 text-gray-500">
              <LogOut size={15} /> Logout
            </button>
          ) : (
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          ))}
        </div>
      </div>
    </header>
  );
}
