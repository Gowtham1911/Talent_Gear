"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Briefcase, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/password/register", {
        method: "POST", body: JSON.stringify({ email: form.email, password: form.password, role: "student" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Registration failed"); return; }
      router.push("/login?registered=1");
    } catch {
      setError("Network error. Is the backend running?");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#fffbf7] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <Briefcase size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">Talent<span className="text-orange-500">Gear</span></span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start applying to top companies</p>
        </div>

        <div className="card p-8">
          {/* Benefits */}
          <div className="bg-orange-50 rounded-xl p-4 mb-6 space-y-2">
            {["AI-matched to relevant jobs", "Instant application status updates", "Unique test link via email"].map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-orange-700">
                <CheckCircle size={14} className="text-orange-500 shrink-0" /> {b}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? "text" : "password"} placeholder="Min. 6 characters"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input className="input" type="password" placeholder="Repeat password"
                value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required />
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
