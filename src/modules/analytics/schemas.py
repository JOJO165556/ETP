from pydantic import BaseModel


class PipelineStats(BaseModel):
    total_applications: int
    by_stage: dict[str, int]
    avg_matching_score: float | None


class JobStats(BaseModel):
    total_jobs: int
    active_jobs: int
    closed_jobs: int
    avg_applications_per_job: float


class CompanyStats(BaseModel):
    company_id: str
    total_jobs: int
    total_applications: int
    hired_count: int
    conversion_rate: float


class HiringFunnel(BaseModel):
    applied: int
    screening: int
    interview: int
    offer: int
    hired: int
    rejected: int


class SkillDemand(BaseModel):
    skill: str
    count: int
    percentage: float


class AnalyticsDashboard(BaseModel):
    pipeline: PipelineStats
    jobs: JobStats
    funnel: HiringFunnel
    top_skills: list[SkillDemand]


class CandidateResume(BaseModel):
    """KPI du candidat (page Overview) — dérivés uniquement de données réelles."""
    vues_profil: int = 0
    evolution_vues: int = 0
    nouveaux_matchs: int = 0
    candidatures_actives: int = 0
    taux_entretien: float = 0.0
    taux_offre: float = 0.0
