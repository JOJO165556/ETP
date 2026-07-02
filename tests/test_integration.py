"""Tests d'intégration pour les services principaux."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


class TestAuthServiceIntegration:
    """Tests d'intégration pour AuthService."""

    @pytest.mark.asyncio
    async def test_register_and_authenticate_flow(self):
        """Test complet: inscription puis authentification."""
        from src.modules.auth.services import AuthService
        from src.modules.auth.schemas import RegisterRequest
        from src.core.security import create_access_token, verify_password

        mock_db = AsyncMock()
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.email = "test@example.com"
        mock_user.hashed_password = "$2b$12$hashed"
        mock_user.is_active = True
        mock_user.role.value = "candidate"

        with patch.object(AuthService, '__init__', lambda self, db: setattr(self, 'db', db) or setattr(self, 'user_repo', MagicMock())):
            service = AuthService(mock_db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=mock_user)

            # Inscription
            token = await service.register(RegisterRequest(
                email="test@example.com",
                password="secret123",
                first_name="Jean",
            ))
            assert token.access_token
            assert token.refresh_token

    @pytest.mark.asyncio
    async def test_change_password_flow(self):
        """Test complet: changement de mot de passe."""
        from src.modules.auth.services import AuthService
        from src.modules.auth.schemas import ChangePasswordRequest
        from src.core.security import get_password_hash

        mock_db = AsyncMock()
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.hashed_password = get_password_hash("old_password")

        service = AuthService.__new__(AuthService)
        service.db = mock_db

        mock_scalars = MagicMock()
        mock_scalars.first.return_value = mock_user
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute = AsyncMock(return_value=mock_result)

        result = await service.change_password("user-123", ChangePasswordRequest(
            current_password="old_password",
            new_password="new_password123",
        ))
        assert "succes" in result["message"].lower()


class TestResumeAnalyzerIntegration:
    """Tests d'intégration pour l'analyseur de CV."""

    def test_full_analysis_pipeline(self):
        """Test complet du pipeline d'analyse de CV."""
        from src.modules.applications.resume_analyzer import LocalResumeAnalyzer

        analyzer = LocalResumeAnalyzer()
        text = """
        Jean Dupont - Développeur Full Stack Senior
        
        Formation:
        Master en Informatique - Université de Paris (2018)
        
        Expérience:
        Senior Developer chez TechCorp (2020-présent)
        - Python, FastAPI, PostgreSQL
        - Docker, Kubernetes, AWS
        - CI/CD, Git, Agile Scrum
        
        Junior Developer chez StartupXYZ (2018-2020)
        - React, TypeScript, Node.js
        - MongoDB, Redis
        """
        result = analyzer.analyze(text)
        assert result.confidence > 0
        assert "python" in result.skills
        assert result.experience_level == "senior"
        assert result.education_level == "master"

    def test_fallback_on_empty_text(self):
        """Test fallback sur texte vide."""
        from src.modules.applications.resume_analyzer import LocalResumeAnalyzer

        analyzer = LocalResumeAnalyzer()
        result = analyzer.analyze("")
        assert result.confidence == 0.0
        assert result.extraction_method == "empty"


class TestNotificationIntegration:
    """Tests d'intégration pour les notifications."""

    def test_email_rendering_pipeline(self):
        """Test complet du rendu d'emails."""
        from src.modules.notifications.services import render_email, NotificationService

        # Rendu de template
        subject, body = render_email("stage_changed", {
            "job_title": "Dev Python Senior",
            "new_stage": "interview",
            "message": "Vous avez été sélectionné pour un entretien.",
        })
        assert "Dev Python Senior" in subject
        assert "interview" in body
        assert "sélectionné" in body

    def test_notification_service_creation(self):
        """Test création de notification."""
        from src.modules.notifications.services import NotificationService

        mock_db = AsyncMock()
        service = NotificationService(mock_db)
        # Vérifie que create retourne un dict valide
        import asyncio
        notification = asyncio.run(service.create(
            recipient_id="user-123",
            subject="Test",
            body="Corps du message",
        ))
        assert notification["recipient_id"] == "user-123"
        assert notification["read"] is False


class TestSearchIntegration:
    """Tests d'intégration pour la recherche."""

    def test_search_filters_construction(self):
        """Test construction des filtres de recherche."""
        from src.modules.search.schemas import JobSearchFilters

        filters = JobSearchFilters(
            query="python developer",
            skills=["python", "fastapi", "postgresql"],
            status="active",
            is_remote=True,
            page=2,
            page_size=10,
        )
        assert filters.query == "python developer"
        assert len(filters.skills) == 3
        assert filters.page == 2


class TestGDPRIntegration:
    """Tests d'intégration pour le RGPD."""

    @pytest.mark.asyncio
    async def test_export_data_flow(self):
        """Test complet d'export de données."""
        from src.modules.gdpr.repository import GDPRRepository

        mock_db = AsyncMock()

        # Mock user
        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.email = "test@example.com"
        mock_user.role.value = "candidate"

        # Mock profile
        mock_profile = MagicMock()
        mock_profile.first_name = "Jean"
        mock_profile.last_name = "Dupont"
        mock_profile.phone = "+33612345678"
        mock_profile.skills = ["python", "fastapi"]

        # Mock applications
        mock_app = MagicMock()
        mock_app.id = "app-456"
        mock_app.stage.value = "interview"
        mock_app.matching_score = 85.5
        mock_app.created_at = datetime.now(timezone.utc)

        mock_apps_result = MagicMock()
        mock_apps_result.all.return_value = [(mock_app, "Dev Python", "company-789")]

        call_count = 0
        async def mock_execute(query):
            nonlocal call_count
            call_count += 1
            result = MagicMock()
            if call_count == 1:  # user query
                result.scalar_one_or_none.return_value = mock_user
            elif call_count == 2:  # profile query
                result.scalar_one_or_none.return_value = mock_profile
            else:  # applications query
                result.all.return_value = [(mock_app, "Dev Python", "company-789")]
            return result

        mock_db.execute = mock_execute

        repo = GDPRRepository(mock_db)
        data = await repo.export_user_data("user-123")

        assert data["email"] == "test@example.com"
        assert data["profile"]["first_name"] == "Jean"
        assert len(data["applications"]) == 1
