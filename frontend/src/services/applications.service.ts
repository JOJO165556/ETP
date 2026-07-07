import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import type { Candidature } from "@/types/domain";

export interface PayloadCreationCandidature {
  job_id: string;
  cover_letter?: string;
}

/* Service pour la gestion des candidatures du candidat */
export const applicationsService = {
  getMesCandidatures: (): Promise<PaginatedResponse<Candidature>> =>
    api.get<PaginatedResponse<Candidature>>("/applications"),

  creerCandidature: (payload: PayloadCreationCandidature): Promise<Candidature> =>
    api.post<Candidature>("/applications", payload),

  retirerCandidature: (id: string): Promise<void> =>
    api.delete<void>(`/applications/${id}`),
};
