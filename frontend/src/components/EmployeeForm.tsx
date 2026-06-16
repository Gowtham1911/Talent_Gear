"use client";
import { useState, FormEvent } from "react";

export interface EmployeeFormData {
  user_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
  status: "active" | "inactive";
}

const DEPARTMENTS = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations"];

interface Props {
  initial?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  submitLabel: string;
}

export default function EmployeeForm({ initial, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<EmployeeFormData>({
    user_id: initial?.user_id ?? 0,
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    phone: initial?.phone ?? "",
    department: initial?.department ?? DEPARTMENTS[0],
    position: initial?.position ?? "",
    salary: initial?.salary ?? 0,
    hire_date: initial?.hire_date ? initial.hire_date.split("T")[0] : "",
    status: initial?.status ?? "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof EmployeeFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>First Name</label>
          <input className={inputClass} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input className={inputClass} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Department</label>
          <select className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Position</label>
          <input className={inputClass} value={form.position} onChange={(e) => set("position", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Salary ($)</label>
          <input type="number" min={0} className={inputClass} value={form.salary} onChange={(e) => set("salary", Number(e.target.value))} required />
        </div>
        <div>
          <label className={labelClass}>Hire Date</label>
          <input type="date" className={inputClass} value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {!initial?.user_id && (
          <div className="sm:col-span-2">
            <label className={labelClass}>User ID (linked account)</label>
            <input type="number" min={1} className={inputClass} value={form.user_id || ""} onChange={(e) => set("user_id", Number(e.target.value))} required />
            <p className="text-xs text-gray-400 mt-1">The user account ID this employee profile is linked to.</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60 text-sm"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
