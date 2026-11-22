import { api } from "@/lib/api";
import type { Interview, InterviewCreate, InterviewUpdate } from "@/types/domain";

export type { InterviewStatus } from "@/types/domain";
export type EntretienAPI = Interview;
export type StatutEntretien = import("@/types/domain").InterviewStatus;

/* Entretiens du recruteur connecté, sur une fenêtre de jours donnée. */
export const interviewsService = {
  getMesEntretiens: (): Promise<EntretienAPI[]> =>
    api.get<EntretienAPI[]>("/interviews/me"),

  creer: (payload: InterviewCreate): Promise<EntretienAPI> =>
    api.post<EntretienAPI>("/interviews", payload),

  mettreAJour: (id: string, payload: InterviewUpdate): Promise<EntretienAPI> =>
    api.patch<EntretienAPI>(`/interviews/${id}`, payload),

  annuler: (id: string, motif?: string): Promise<EntretienAPI> => {
    const query = motif ? `?reason=${encodeURIComponent(motif)}` : "";
    return api.post<EntretienAPI>(`/interviews/${id}/cancel${query}`);
  },
};
