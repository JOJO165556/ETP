import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from src.modules.analytics.repository import AnalyticsRepository
from src.modules.analytics.schemas import (
    PipelineStats, JobStats, HiringFunnel, SkillDemand, AnalyticsDashboard,
)
from src.modules.gdpr.schemas import (
    DataExportResponse, DataDeletionRequest, DataDeletionResponse,
)


class TestAnalyticsSchemas:
    """Tests pour les schémas Pydantic des analytics."""

    def test_pipeline_stats(self):
        data = {"total_applications": 42, "by_stage": {"applied": 10}, "avg_matching_score": 72.5}
        stats = PipelineStats(**data)
        assert stats.total_applications == 42
        assert stats.avg_matching_score == 72.5

    def test_pipeline_stats_null_score(self):
        data = {"total_applications": 0, "by_stage": {}, "avg_matching_score": None}
        stats = PipelineStats(**data)
        assert stats.avg_matching_score is None

    def test_job_stats(self):
        data = {"total_jobs": 5, "active_jobs": 3, "closed_jobs": 2, "avg_applications_per_job": 8.5}
        stats = JobStats(**data)
        assert stats.active_jobs == 3

    def test_hiring_funnel(self):
        data = {"applied": 100, "screening": 50, "interview": 20, "offer": 5, "hired": 3, "rejected": 22}
        funnel = HiringFunnel(**data)
        assert funnel.hired == 3
        assert funnel.rejected == 22

    def test_skill_demand(self):
        data = {"skill": "python", "count": 15, "percentage": 35.2}
        skill = SkillDemand(**data)
        assert skill.skill == "python"
        assert skill.percentage == 35.2

    def test_analytics_dashboard(self):
        pipeline = PipelineStats(total_applications=10, by_stage={}, avg_matching_score=None)
        jobs = JobStats(total_jobs=5, active_jobs=3, closed_jobs=2, avg_applications_per_job=2.0)
        funnel = HiringFunnel(applied=10, screening=5, interview=3, offer=1, hired=1, rejected=0)
        skills = [SkillDemand(skill="python", count=5, percentage=50.0)]
        dashboard = AnalyticsDashboard(pipeline=pipeline, jobs=jobs, funnel=funnel, top_skills=skills)
        assert dashboard.pipeline.total_applications == 10
        assert len(dashboard.top_skills) == 1


class TestGDPRSchemas:
    """Tests pour les schémas Pydantic RGPD."""

    def test_export_response(self):
        resp = DataExportResponse(user_id="u1", email="a@b.com", profile=None, applications=[], consent_records=[])
        assert resp.user_id == "u1"
        assert resp.applications == []

    def test_deletion_request_not_confirmed(self):
        req = DataDeletionRequest(user_id="u1", confirm=False)
        assert req.confirm is False

    def test_deletion_response(self):
        resp = DataDeletionResponse(user_id="u1", deleted=True, message="OK")
        assert resp.deleted is True
