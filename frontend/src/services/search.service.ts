import { api } from "@/lib/api";
import type { Job, TalentPoolCandidate } from "@/types/domain";

export interface SearchJobsParams {
  q?: string;
  location?: string;
  skills?: string[];
  skip?: number;
  limit?: number;
}

export interface SearchCandidatesParams {
  q?: string;
  skills?: string[];
  skip?: number;
  limit?: number;
}

export const searchService = {
  searchJobs: (params: SearchJobsParams): Promise<Job[]> =>
    api.post<Job[]>("/search/jobs", params),

  searchCandidates: (params: SearchCandidatesParams): Promise<TalentPoolCandidate[]> =>
    api.post<TalentPoolCandidate[]>("/search/candidates", params),
};
