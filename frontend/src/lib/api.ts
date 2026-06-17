export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://talent-gear-backend.onrender.com";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tg_token");
}
export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tg_role");
}
export function saveAuth(token: string, role: string) {
  localStorage.setItem("tg_token", token);
  localStorage.setItem("tg_role", role);
}
export function clearAuth() {
  localStorage.removeItem("tg_token");
  localStorage.removeItem("tg_role");
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

export async function apiFetchForm(path: string, body: FormData): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
}
