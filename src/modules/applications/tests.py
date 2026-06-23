import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.applications.tasks import calculate_smart_match


class TestSmartJobMatchingAlgorithm:
    """Tests pour l'algorithme de Smart Job Matching."""

    @pytest.mark.asyncio
    async def test_calculate_match_with_all_skills_matched(self):
        """Test le matching lorsque toutes les compétences du candidat correspondent aux compétences requises."""
        candidate_skills = ["python", "fastapi", "postgresql"]
        extracted_text = "Je suis un développeur Python senior avec 5 ans d'expérience en FastAPI et PostgreSQL. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python", "fastapi", "postgresql"]
        mock_job.description = "Senior Python developer with 5 years experience in FastAPI and PostgreSQL"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["overall_score"] >= 75
        assert result["recommended_stage"] == "screening"
        assert all(skill["matched"] for skill in result["skill_details"].values())
        assert result["job_skills_required"] == ["python", "fastapi", "postgresql"]
        assert result["candidate_skills_found"] == candidate_skills
        assert result["candidate_experience_level"] == "senior"
        assert result["job_experience_level"] == "senior"

    @pytest.mark.asyncio
    async def test_calculate_match_with_partial_skills_matched(self):
        """Test le matching lorsque seulement certaines compétences correspondent."""
        candidate_skills = ["python", "react"]
        extracted_text = "Développeur Python avec expérience en React et Node.js. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python", "fastapi", "react", "docker"]
        mock_job.description = "Senior Python developer with React and Docker experience"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["overall_score"] >= 30
        assert result["recommended_stage"] == "applied"
        assert result["job_skills_required"] == ["python", "fastapi", "react", "docker"]
        assert result["candidate_skills_found"] == candidate_skills
        
        # Vérifier les détails des compétences
        matched_skills = [s for s, details in result["skill_details"].items() if details["matched"]]
        assert "python" in matched_skills
        assert "react" in matched_skills
        assert "fastapi" not in matched_skills
        assert "docker" not in matched_skills

    @pytest.mark.asyncio
    async def test_calculate_match_with_no_skills_matched(self):
        """Test le matching lorsque aucune compétence ne correspond."""
        candidate_skills = ["java", "spring"]
        extracted_text = "Développeur Java senior avec expérience en Spring Boot. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python", "fastapi", "react"]
        mock_job.description = "Senior Python developer"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["overall_score"] < 60
        assert result["recommended_stage"] == "applied"
        assert result["job_skills_required"] == ["python", "fastapi", "react"]
        assert result["candidate_skills_found"] == candidate_skills
        
        # Toutes les compétences devraient être non correspondantes
        assert all(not details["matched"] for details in result["skill_details"].values())

    @pytest.mark.asyncio
    async def test_calculate_match_with_empty_job_skills(self):
        """Test le matching lorsque le job n'a pas de compétences requises."""
        candidate_skills = ["python", "fastapi"]
        extracted_text = "Développeur Python senior. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = []
        mock_job.description = "Senior Python developer"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["job_skills_required"] == []
        assert result["candidate_skills_found"] == candidate_skills

    @pytest.mark.asyncio
    async def test_calculate_match_with_dict_job_skills(self):
        """Test le matching lorsque les compétences requises sont un dictionnaire."""
        candidate_skills = ["python", "postgresql"]
        extracted_text = "Administrateur PostgreSQL avec expérience en Python. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = {"python": "advanced", "postgresql": "expert", "docker": "basic"}
        mock_job.description = "Senior PostgreSQL administrator"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert "python" in result["job_skills_required"]
        assert "postgresql" in result["job_skills_required"]
        assert "docker" in result["job_skills_required"]
        assert result["candidate_skills_found"] == candidate_skills

    @pytest.mark.asyncio
    async def test_calculate_match_with_none_job_skills(self):
        """Test le matching lorsque les compétences requises sont None."""
        candidate_skills = ["python"]
        extracted_text = "Développeur Python. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = None
        mock_job.description = "Python developer"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["job_skills_required"] == []
        assert result["candidate_skills_found"] == candidate_skills

    @pytest.mark.asyncio
    async def test_calculate_match_with_education_keywords(self):
        """Test le matching avec détection des mots-clés d'éducation."""
        candidate_skills = ["python"]
        extracted_text = "Licence en informatique de l'Université de Paris, spécialisation en Python."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python"]
        mock_job.description = "Bachelor in Computer Science"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        # Devrait avoir un bonus d'éducation
        assert result["education_match"] == 15.0  # EDUCATION_WEIGHT * 100
        assert result["overall_score"] >= 65  # Skill match + education bonus

    @pytest.mark.asyncio
    async def test_calculate_match_skill_normalization(self):
        """Test la normalisation des compétences (minuscules, espaces)."""
        candidate_skills = ["Python", "  postgresql  ", "FastAPI"]
        extracted_text = "Développeur Python senior. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python", "postgresql", "fastapi"]
        mock_job.description = "Senior Python developer"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        # Toutes les compétences devraient correspondre malgré la différence de formatage
        assert all(details["matched"] for details in result["skill_details"].values())
        assert result["overall_score"] >= 75

    @pytest.mark.asyncio
    async def test_calculate_match_experience_level_matching(self):
        """Test le matching des niveaux d'expérience."""
        candidate_skills = ["python"]
        extracted_text = "Développeur Python senior avec 10 ans d'expérience. Licence en informatique."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python"]
        mock_job.description = "Senior Python developer"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["candidate_experience_level"] == "senior"
        assert result["job_experience_level"] == "senior"
        assert result["overall_score"] >= 80

    @pytest.mark.asyncio
    async def test_calculate_match_education_level_matching(self):
        """Test le matching des niveaux d'éducation."""
        candidate_skills = ["python"]
        extracted_text = "Doctorat en informatique, Université de Paris."
        
        mock_job = MagicMock()
        mock_job.required_skills = ["python"]
        mock_job.description = "Bachelor in Computer Science"
        
        result = await calculate_smart_match(candidate_skills, extracted_text, mock_job)
        
        assert result["candidate_education_level"] == "phd"
        assert result["job_education_level"] == "bachelor"
        # Education match should be less than skill weight in this case
        assert result["education_match"] < result["skill_details"]["python"]["weight"]

    @pytest.mark.asyncio
    async def test_celery_task_states(self):
        """Test les états de la tâche Celery."""
        from src.modules.applications.tasks import (
            CELERY_TASK_PENDING, CELERY_TASK_STARTED, CELERY_TASK_SUCCESS, 
            CELERY_TASK_FAILURE, CELERY_TASK_RETRY
        )
        
        # Vérifier que les constantes sont définies
        assert CELERY_TASK_PENDING == "PENDING"
        assert CELERY_TASK_STARTED == "STARTED"
        assert CELERY_TASK_SUCCESS == "SUCCESS"
        assert CELERY_TASK_FAILURE == "FAILURE"
        assert CELERY_TASK_RETRY == "RETRY"