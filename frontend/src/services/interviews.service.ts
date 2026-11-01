import { api } from "@/lib/api";

export type StatutEntretien = "scheduled" | "completed" | "cancelled" | "no_show";

export interface EntretienAPI {
  id: string;
  application_id: string;
  interviewer_id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  notes: string | null;
  status: StatutEntretien;
  created_at: string;
  updated_at: string;
}

/* Entretiens du recruteur connecté, sur une fenêtre de jours donnée. */
export const interviewsService = {
  getAVenir: (jours = 180): Promise<EntretienAPI[]> =>
    api.get<EntretienAPI[]>(`/interviews/upcoming?days=${jours}`),

  annuler: (id: string, motif?: string): Promise<EntretienAPI> => {
    const query = motif ? `?reason=${encodeURIComponent(motif)}` : "";
    return api.post<EntretienAPI>(`/interviews/${id}/cancel${query}`);
  },
};
