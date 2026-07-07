import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import type { ProfilCandidat, CandidatVivier } from "@/types/domain";

export interface PayloadMiseAJourProfil {
  full_name?: string;
  headline?: string;
  location?: string;
  is_profile_public?: boolean;
  is_searchable?: boolean;
}

/* Service pour la gestion du profil et accès au vivier de talents pour les recruteurs */
export const usersService = {
  getMonProfil: (): Promise<ProfilCandidat> => api.get<ProfilCandidat>("/users/me"),

  mettreAJourProfil: (payload: PayloadMiseAJourProfil): Promise<ProfilCandidat> =>
    api.patch<ProfilCandidat>("/users/me", payload),

  // Recruteur : lister tous les candidats (vivier de talents)
  getCandidats: (params?: {
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<CandidatVivier>> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.page != null) query.set("page", String(params.page));
    if (params?.size != null) query.set("size", String(params.size));
    const qs = query.toString();
    return api.get<PaginatedResponse<CandidatVivier>>(`/users${qs ? `?${qs}` : ""}`);
  },

  getCandidatParId: (id: string): Promise<CandidatVivier> =>
    api.get<CandidatVivier>(`/users/${id}`),
};
