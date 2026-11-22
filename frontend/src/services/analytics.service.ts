import { api } from "@/lib/api";
import type { AnalyticsDashboard, CandidateResume } from "@/types/domain";

/* Service des statistiques */
export const analyticsService = {
  getMonResume: (): Promise<CandidateResume> =>
    api.get<CandidateResume>("/analytics/candidates/me"),

  getDashboard: (): Promise<AnalyticsDashboard> =>
    api.get<AnalyticsDashboard>("/analytics/dashboard"),
};
