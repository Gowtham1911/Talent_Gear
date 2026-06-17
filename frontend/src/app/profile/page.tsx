"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, API_BASE } from "@/lib/api";
import SidebarLayout from "@/components/SidebarLayout";
import {
  User, Mail, Phone, MapPin, Link, GitBranch, Camera,
  FileText, Plus, X, Save, CheckCircle, Edit3, Briefcase, BookOpen
} from "lucide-react";

interface Profile {
  id: number; email: string; role: string; full_name: string;
  phone: string; location: string; linkedin: string; github: string;
  photo_url: string; resume_url: string; skills: string[];
  experience_years: number | null; bio: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const photoRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "https://talent-gear-backend.onrender.com";

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    apiFetch("/api/auth/profile")
      .then(r => r.json())
      .then((data: Profile) => { setProfile(data); setForm(data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function save() {
    setSaving(true);
    await apiFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({
        full_name: form.full_name, phone: form.phone, location: form.location,
        linkedin: form.linkedin, github: form.github, skills: form.skills || [],
        experience_years: form.experience_years, bio: form.bio,
      }),
    });
    setProfile(p => p ? { ...p, ...form } as Profile : p);
    setSaving(false); setSaved(true); setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  }

  async function uploadPhoto(file: File) {
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const token = getToken();
    const res = await fetch(`${API}/api/auth/profile/photo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    const data = await res.json();
    if (data.photo_url) {
      setProfile(p => p ? { ...p, photo_url: data.photo_url } : p);
      setForm(f => ({ ...f, photo_url: data.photo_url }));
    }
    setPhotoUploading(false);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    const skills = [...(form.skills || [])];
    if (!skills.includes(s)) { skills.push(s); setForm(f => ({ ...f, skills })); }
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setForm(f => ({ ...f, skills: (f.skills || []).filter(x => x !== s) }));
  }

  if (loading) return (
    <SidebarLayout>
      <div className="page-container">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto" />
          <div className="h-4 bg-gray-100 rounded w-1/3 mx-auto" />
          <div className="h-3 bg-gray-100 rounded w-1/4 mx-auto" />
        </div>
      </div>
    </SidebarLayout>
  );

  const photoSrc = profile?.photo_url ? `${API}${profile.photo_url}` : null;
  const initials = (profile?.full_name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <SidebarLayout>
      <div className="page-container max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title mb-1">My Profile</h1>
            <p className="text-gray-500 text-sm">Manage your personal information and resume</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle size={15} /> Saved!
              </span>
            )}
            {editMode ? (
              <>
                <button onClick={() => { setForm(profile!); setEditMode(false); }} className="btn-secondary text-sm py-2">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2">
                  <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="btn-primary text-sm py-2 flex items-center gap-2">
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Photo + Quick Info */}
          <div className="space-y-4">
            {/* Photo card */}
            <div className="card p-6 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto">
                  {photoSrc ? (
                    <img src={photoSrc} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors"
                >
                  <Camera size={13} className="text-white" />
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </div>
              {photoUploading && <p className="text-xs text-orange-500 mb-2">Uploading…</p>}
              <h2 className="font-bold text-gray-900 text-lg">{profile?.full_name || profile?.email?.split("@")[0] || "—"}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
              <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${profile?.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                {profile?.role === "admin" ? "Admin" : "Candidate"}
              </span>
              {profile?.location && (
                <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <MapPin size={11} /> {profile.location}
                </p>
              )}
              {profile?.experience_years != null && (
                <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                  <Briefcase size={11} /> {profile.experience_years} yr{profile.experience_years !== 1 ? "s" : ""} experience
                </p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Passport-size photo recommended (JPG/PNG, max 2MB)
              </p>
            </div>

            {/* Links */}
            <div className="card p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Social Links</p>
              {editMode ? (
                <>
                  <div>
                    <label className="label flex items-center gap-1.5"><Link size={13} /> LinkedIn URL</label>
                    <input className="input text-sm" placeholder="https://linkedin.com/in/..." value={form.linkedin || ""} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><GitBranch size={13} /> GitHub URL</label>
                    <input className="input text-sm" placeholder="https://github.com/..." value={form.github || ""} onChange={e => setForm(f => ({ ...f, github: e.target.value }))} />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {profile?.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                      <Link size={14} /> LinkedIn Profile
                    </a>
                  ) : <p className="text-xs text-gray-400 flex items-center gap-2"><Link size={13} /> Not added</p>}
                  {profile?.github ? (
                    <a href={profile.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:underline">
                      <GitBranch size={14} /> GitHub Profile
                    </a>
                  ) : <p className="text-xs text-gray-400 flex items-center gap-2"><GitBranch size={13} /> Not added</p>}
                </div>
              )}
            </div>
          </div>

          {/* Right — Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal Info */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Personal Information</p>
              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center gap-1.5"><User size={13} /> Full Name</label>
                    <input className="input text-sm" placeholder="Your full name" value={form.full_name || ""} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Phone size={13} /> Phone</label>
                    <input className="input text-sm" placeholder="+91 9876543210" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><MapPin size={13} /> Location</label>
                    <input className="input text-sm" placeholder="City, State" value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Briefcase size={13} /> Experience (years)</label>
                    <input className="input text-sm" type="number" min="0" step="0.5" placeholder="e.g. 2" value={form.experience_years ?? ""} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value ? Number(e.target.value) : null }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label flex items-center gap-1.5"><Mail size={13} /> Email</label>
                    <input className="input text-sm bg-gray-50 cursor-not-allowed" value={profile?.email || ""} disabled />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: User,     label: "Full Name",   value: profile?.full_name },
                    { icon: Mail,     label: "Email",       value: profile?.email },
                    { icon: Phone,    label: "Phone",       value: profile?.phone },
                    { icon: MapPin,   label: "Location",    value: profile?.location },
                    { icon: Briefcase,label: "Experience",  value: profile?.experience_years != null ? `${profile.experience_years} year${profile.experience_years !== 1 ? "s" : ""}` : null },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={14} className="text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">{value || <span className="text-gray-300">Not provided</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5"><BookOpen size={13} /> About Me</p>
              {editMode ? (
                <textarea
                  className="input text-sm resize-none"
                  rows={4}
                  placeholder="Write a short bio about yourself, your experience and what you're looking for..."
                  value={form.bio || ""}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {profile?.bio || <span className="text-gray-400 italic">No bio added yet. Click Edit Profile to add one.</span>}
                </p>
              )}
            </div>

            {/* Skills */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Skills</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(form.skills || []).map(s => (
                  <span key={s} className="flex items-center gap-1.5 text-sm px-3 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-100 font-medium">
                    {s}
                    {editMode && (
                      <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
                {(form.skills || []).length === 0 && !editMode && (
                  <p className="text-sm text-gray-400 italic">No skills added yet</p>
                )}
              </div>
              {editMode && (
                <div className="flex gap-2 mt-3">
                  <input
                    className="input text-sm flex-1"
                    placeholder="e.g. React, Python, SQL…"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  />
                  <button onClick={addSkill} className="btn-primary px-3 py-2">
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Resume */}
            <div className="card p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                <FileText size={13} /> Resume
              </p>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">Resume / CV</p>
                  <p className="text-xs text-gray-400 mt-0.5">Your resume is automatically saved when you apply for a job</p>
                </div>
                {profile?.resume_url ? (
                  <a href={`${API}${profile.resume_url}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3 shrink-0">
                    View
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">Not uploaded</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                💡 Upload your resume when applying for a job — it will appear here automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
