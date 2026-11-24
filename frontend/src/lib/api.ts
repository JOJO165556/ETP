import type { ApiError } from "@/types";

/* Erreur HTTP portant le code de statut, pour distinguer par ex. un 409. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_V1}${endpoint}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  // 401 : Déconnexion automatique uniquement si l'endpoint de validation de session
  // explicite (/auth/me ou /auth/refresh) confirme l'invalidation définitive.
  // On ne redirige JAMAIS sur un échec temporaire de /users/me ou de requêtes métier
  // afin d'éviter les déconnexions intempestives lors d'un cold start du serveur.
  const isStrictSessionCheck =
    endpoint === "/auth/me" || endpoint === "/auth/refresh";
  if (res.status === 401 && isStrictSessionCheck) {
    if (typeof window !== "undefined") {
      fetch("/api/auth/logout").catch(() => {});
      window.location.href = "/login?error=session_expired";
    }
    throw new Error("Session expirée ou non autorisée");
  }
  if (
    res.status === 403 &&
    (endpoint.includes("/users/me") || endpoint.includes("/auth/me"))
  ) {
    if (typeof window !== "undefined") {
      fetch("/api/auth/logout").catch(() => {});
      window.location.href = "/login?error=session_expired";
    }
    throw new Error("Session expirée ou non autorisée");
  }

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      detail: "Une erreur inattendue s'est produite",
    }));
    throw new ApiRequestError(error.detail, res.status);
  }

  // 204 No Content : aucun corps à parser
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// Interface HTTP unifiée : utiliser ces méthodes dans tous les services
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
