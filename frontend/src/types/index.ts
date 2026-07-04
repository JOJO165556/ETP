// Types primitifs brandés pour éviter les confusions entre identifiants
export type UserId = string & { readonly _brand: "UserId" };
export type CompanyId = string & { readonly _brand: "CompanyId" };
export type JobId = string & { readonly _brand: "JobId" };
export type Email = string & { readonly _brand: "Email" };

// Rôles utilisateur alignés sur le modèle backend
export type UserRole = "superadmin" | "company_admin" | "recruiter" | "candidate";

// Réponse d'authentification retournée par /auth/login et /auth/register
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

// Profil utilisateur retourné par /users/me
export interface User {
  id: UserId;
  email: Email;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  company_id?: CompanyId;
  created_at: string;
  updated_at: string;
}

// Erreur standard retournée par l'API FastAPI
export interface ApiError {
  detail: string;
  status_code?: number;
}

// Réponse paginée générique
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Union discriminante pour le statut d'une requête asynchrone
export type RequestStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };
