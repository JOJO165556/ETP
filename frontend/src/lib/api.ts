import type { ApiError } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// Côté client, on appelle le proxy local Next.js pour que les cookies HttpOnly soient envoyés.
const API_V1 = typeof window !== "undefined" ? "/api/v1" : `${API_BASE}/api/v1`;

/*
 * Effectue un appel HTTP.
 * Le token JWT n'est plus stocké côté client (XSS).
 * Le navigateur enverra automatiquement le cookie HttpOnly vers le proxy Next.js.
 * Le Middleware se chargera d'injecter le header Authorization vers FastAPI.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_V1}${endpoint}`, { ...options, headers });

  // 401 Non autorisé : redirection gérée proprement
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expirée");
  }

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      detail: "Une erreur inattendue s'est produite",
    }));
    throw new Error(error.detail);
  }

  // 204 No Content : aucun corps à parser
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// Interface HTTP unifiée — utiliser ces méthodes dans tous les services
export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    request<T>(url, { method: "GET", ...options }),

  post: <T>(url: string, body?: unknown, options?: RequestInit) => {
    const isRaw = body instanceof FormData || body instanceof URLSearchParams;
    return request<T>(url, {
      method: "POST",
      body: isRaw ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  put: <T>(url: string, body?: unknown, options?: RequestInit) => {
    const isRaw = body instanceof FormData || body instanceof URLSearchParams;
    return request<T>(url, {
      method: "PUT",
      body: isRaw ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  patch: <T>(url: string, body?: unknown, options?: RequestInit) => {
    const isRaw = body instanceof FormData || body instanceof URLSearchParams;
    return request<T>(url, {
      method: "PATCH",
      body: isRaw ? (body as BodyInit) : JSON.stringify(body),
      ...options,
    });
  },

  delete: <T>(url: string, options?: RequestInit) =>
    request<T>(url, { method: "DELETE", ...options }),
};

export { API_V1 };
