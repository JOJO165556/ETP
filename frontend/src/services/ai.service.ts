import { api } from "@/lib/api";

export interface ReglesPreselection {
  id: string | null;
  company_id: string | null;
  provider_id: string | null;
  weight_skills: number;
  weight_experience: number;
  weight_education: number;
  threshold_screening: number;
  threshold_reject: number;
  auto_stage_update: boolean;
  semantic_matching: boolean;
  source: string;
  updated_at: string | null;
}

export interface ReglesPreselectionPayload {
  weight_skills: number;
  weight_experience: number;
  weight_education: number;
  threshold_screening: number;
  threshold_reject: number;
  auto_stage_update: boolean;
  semantic_matching: boolean;
}

/* Règles de présélection appliquées aux candidatures de l'entreprise. */
export const aiService = {
  getRegles: (): Promise<ReglesPreselection> => api.get<ReglesPreselection>("/ai/config"),

  enregistrerRegles: (payload: ReglesPreselectionPayload): Promise<ReglesPreselection> =>
    api.put<ReglesPreselection>("/ai/config", payload),
};
