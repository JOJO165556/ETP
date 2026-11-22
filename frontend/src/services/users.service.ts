import { api } from "@/lib/api";
import type {
  ExperienceCreate,
  ExperienceResponse,
  ExperienceUpdate,
  FormationCreate,
  FormationResponse,
  FormationUpdate,
  UserBriefResponse,
  UserMeUpdate,
  UserResponse,
} from "@/types/domain";

/* Service pour le profil utilisateur, le parcours candidat et le vivier de talents (recruteurs) */
export const usersService = {
  getMonProfil: (): Promise<UserResponse> => api.get<UserResponse>("/users/me"),

  mettreAJourProfil: (payload: UserMeUpdate): Promise<UserResponse> =>
    api.patch<UserResponse>("/users/me", payload),

  getLienCV: (userId: string): Promise<{ download_url: string }> =>
    api.get<{ download_url: string }>(`/users/profile/cv/${userId}`),

  getMesExperiences: (): Promise<ExperienceResponse[]> =>
    api.get<ExperienceResponse[]>("/users/me/experiences"),

  ajouterExperience: (payload: ExperienceCreate): Promise<ExperienceResponse> =>
    api.post<ExperienceResponse>("/users/me/experiences", payload),

  mettreAJourExperience: (
    id: string,
    payload: ExperienceUpdate
  ): Promise<ExperienceResponse> =>
    api.patch<ExperienceResponse>(`/users/me/experiences/${id}`, payload),

  supprimerExperience: (id: string): Promise<void> =>
    api.delete<void>(`/users/me/experiences/${id}`),

  getMesFormations: (): Promise<FormationResponse[]> =>
    api.get<FormationResponse[]>("/users/me/formations"),

  ajouterFormation: (payload: FormationCreate): Promise<FormationResponse> =>
    api.post<FormationResponse>("/users/me/formations", payload),

  mettreAJourFormation: (
    id: string,
    payload: FormationUpdate
  ): Promise<FormationResponse> =>
    api.patch<FormationResponse>(`/users/me/formations/${id}`, payload),

  supprimerFormation: (id: string): Promise<void> =>
    api.delete<void>(`/users/me/formations/${id}`),

  getCandidats: (params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<UserBriefResponse[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.skip != null) query.set("skip", String(params.skip));
    if (params?.limit != null) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<UserBriefResponse[]>(`/users${qs ? `?${qs}` : ""}`);
  },

  getCandidatParId: (id: string): Promise<UserBriefResponse> =>
    api.get<UserBriefResponse>(`/users/${id}`),
};
