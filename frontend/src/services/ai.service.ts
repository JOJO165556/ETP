import { api } from "@/lib/api";
import type { AIJobConfigResponse, AIJobConfigUpdate } from "@/types/domain";

export type ReglesPreselection = AIJobConfigResponse;
export type ReglesPreselectionPayload = AIJobConfigUpdate;

/* Règles de présélection appliquées aux candidatures de l'entreprise. */
export const aiService = {
  getRegles: (): Promise<ReglesPreselection> => api.get<ReglesPreselection>("/ai/config"),

  enregistrerRegles: (payload: ReglesPreselectionPayload): Promise<ReglesPreselection> =>
    api.put<ReglesPreselection>("/ai/config", payload),
};
