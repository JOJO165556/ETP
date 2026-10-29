import { api } from "@/lib/api";
import type {
  CandidatVivier,
  ExperiencePayload,
  ExperiencePro,
  FormationPayload,
  FormationPro,
  MiseAJourProfilPayload,
  UserProfil,
} from "@/types/domain";

/* Service pour le profil utilisateur, le parcours candidat et le vivier de talents (recruteurs) */
export const usersService = {
  getMonProfil: (): Promise<UserProfil> => api.get<UserProfil>("/users/me"),

  mettreAJourProfil: (payload: MiseAJourProfilPayload): Promise<UserProfil> =>
    api.patch<UserProfil>("/users/me", payload),

  getLienCV: (userId: string): Promise<{ download_url: string }> =>
    api.get<{ download_url: string }>(`/users/profile/cv/${userId}`),

  /* --- Parcours candidat : expériences professionnelles --- */
  getMesExperiences: (): Promise<ExperiencePro[]> =>
    api.get<ExperiencePro[]>("/users/me/experiences"),

  ajouterExperience: (payload: ExperiencePayload): Promise<ExperiencePro> =>
    api.post<ExperiencePro>("/users/me/experiences", payload),

  mettreAJourExperience: (
    id: string,
    payload: Partial<ExperiencePayload>
  ): Promise<ExperiencePro> =>
    api.patch<ExperiencePro>(`/users/me/experiences/${id}`, payload),

  supprimerExperience: (id: string): Promise<void> =>
    api.delete<void>(`/users/me/experiences/${id}`),

  /* --- Parcours candidat : formations / diplômes --- */
  getMesFormations: (): Promise<FormationPro[]> =>
    api.get<FormationPro[]>("/users/me/formations"),

  ajouterFormation: (payload: FormationPayload): Promise<FormationPro> =>
    api.post<FormationPro>("/users/me/formations", payload),

  mettreAJourFormation: (
    id: string,
    payload: Partial<FormationPayload>
  ): Promise<FormationPro> =>
    api.patch<FormationPro>(`/users/me/formations/${id}`, payload),

  supprimerFormation: (id: string): Promise<void> =>
    api.delete<void>(`/users/me/formations/${id}`),

  /* --- Vivier recruteur --- */
  getCandidats: (params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<CandidatVivier[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.skip != null) query.set("skip", String(params.skip));
    if (params?.limit != null) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<CandidatVivier[]>(`/users${qs ? `?${qs}` : ""}`);
  },

  getCandidatParId: (id: string): Promise<CandidatVivier> =>
    api.get<CandidatVivier>(`/users/${id}`),
};