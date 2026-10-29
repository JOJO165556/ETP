import { api } from "@/lib/api";
import type { ResumeAnalytiques } from "@/types/domain";

export interface PipelineStats {
  total_applications: number;
  by_stage: Record<string, number>;
}

export interface JobStats {
  total_active_jobs: number;
  avg_time_to_hire_days: number;
  top_performing_jobs: Array<{
    id: string;
    title: string;
    applicants_count: number;
    hire_count: number;
  }>;
}

export interface HiringFunnel {
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  hired: number;
  conversion_rates: Record<string, number>;
}

export interface SkillDemand {
  skill: string;
  count: number;
  trend: string;
}

export interface AnalyticsDashboard {
  pipeline: PipelineStats;
  jobs: JobStats;
  funnel: HiringFunnel;
  top_skills: SkillDemand[];
}

export interface CompanyStats {
  total_jobs: number;
  total_applications: number;
  hired_candidates: number;
}

/* Service des statistiques */
export const analyticsService = {
  getMonResume: (): Promise<ResumeAnalytiques> =>
    api.get<ResumeAnalytiques>("/analytics/candidates/me"),

  getDashboard: (): Promise<AnalyticsDashboard> =>
    api.get<AnalyticsDashboard>("/analytics/dashboard"),

  getPipelineStats: (): Promise<PipelineStats> =>
    api.get<PipelineStats>("/analytics/pipeline"),

  getJobStats: (): Promise<JobStats> =>
    api.get<JobStats>("/analytics/jobs"),

  getHiringFunnel: (): Promise<HiringFunnel> =>
    api.get<HiringFunnel>("/analytics/funnel"),

  getTopSkills: (limit = 10): Promise<SkillDemand[]> =>
    api.get<SkillDemand[]>(`/analytics/skills?limit=${limit}`),
    
  getCompanyStats: (companyId: string): Promise<CompanyStats> =>
    api.get<CompanyStats>(`/analytics/companies/${companyId}`),
};