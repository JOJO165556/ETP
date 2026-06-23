import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.applications.tasks import calculate_smart_match
from src.modules.applications.resume_analyzer import LocalResumeAnalyzer, ResumeAnalysis


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
        # L'IA peut extraire plus de compétences que l'entrée statique
        assert "python" in result["candidate_skills_found"]
        assert "fastapi" in result["candidate_skills_found"]
        assert "postgresql" in result["candidate_skills_found"]
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
        # L'IA peut extraire plus de compétences que l'entrée statique
        assert "python" in result["candidate_skills_found"]
        assert "react" in result["candidate_skills_found"]
        
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
        # L'IA peut extraire plus de compétences que l'entrée statique
        assert "python" in result["candidate_skills_found"]
        assert "postgresql" in result["candidate_skills_found"]

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
        # "Licence" = bachelor, "Bachelor" = bachelor → même niveau → EDUCATION_WEIGHT * 100
        assert result["education_match"] == 15.0  # EDUCATION_WEIGHT * 100 (equal levels)
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


class TestLocalResumeAnalyzer:
    """Tests pour l'analyseur de CV local (LocalResumeAnalyzer)."""

    def setup_method(self):
        self.analyzer = LocalResumeAnalyzer()

    def test_extract_skills_python(self):
        """Test extraction de compétences Python."""
        text = "Développeur Python avec 5 ans d'expérience en FastAPI et Docker."
        skills = self.analyzer.extract_skills(text)
        assert "python" in skills
        assert "fastapi" in skills
        assert "docker" in skills

    def test_extract_skills_react(self):
        """Test extraction de compétences React."""
        text = "Frontend developer avec React, TypeScript et CSS3."
        skills = self.analyzer.extract_skills(text)
        assert "react" in skills
        assert "typescript" in skills
        assert "css" in skills

    def test_extract_skills_docker_kubernetes(self):
        """Test extraction Docker et Kubernetes."""
        text = "DevOps engineer avec Docker, Kubernetes et Terraform."
        skills = self.analyzer.extract_skills(text)
        assert "docker" in skills
        assert "kubernetes" in skills
        assert "terraform" in skills

    def test_extract_skills_empty_text(self):
        """Test extraction avec texte vide."""
        skills = self.analyzer.extract_skills("")
        assert skills == []

    def test_extract_skills_no_match(self):
        """Test extraction sans compétence trouvée."""
        text = "J'aime le chocolat et les vacances."
        skills = self.analyzer.extract_skills(text)
        assert skills == []

    def test_extract_experience_senior(self):
        """Test détection niveau expérience senior."""
        text = "Senior developer avec 10 ans d'expérience."
        level = self.analyzer.extract_experience_level(text)
        assert level == "senior"

    def test_extract_experience_junior(self):
        """Test détection niveau expérience junior."""
        text = "Junior developer débutant en Python."
        level = self.analyzer.extract_experience_level(text)
        assert level == "junior"

    def test_extract_experience_intern(self):
        """Test détection niveau expérience stagiaire."""
        text = "Stagiaire en développement web."
        level = self.analyzer.extract_experience_level(text)
        assert level == "intern"

    def test_extract_experience_unknown(self):
        """Test détection niveau expérience inconnu."""
        text = "Développeur Python."
        level = self.analyzer.extract_experience_level(text)
        assert level == "unknown"

    def test_extract_education_bachelor(self):
        """Test détection niveau éducation bachelor."""
        text = "Licence en informatique."
        level = self.analyzer.extract_education_level(text)
        assert level == "bachelor"

    def test_extract_education_master(self):
        """Test détection niveau éducation master."""
        text = "Master en intelligence artificielle."
        level = self.analyzer.extract_education_level(text)
        assert level == "master"

    def test_extract_education_phd(self):
        """Test détection niveau éducation doctorat."""
        text = "Doctorat en informatique, thèse sur le deep learning."
        level = self.analyzer.extract_education_level(text)
        assert level == "phd"

    def test_extract_education_high_school(self):
        """Test détection niveau éducation lycée."""
        text = "Baccalauréat S mention bien."
        level = self.analyzer.extract_education_level(text)
        assert level == "high_school"

    def test_analyze_complete(self):
        """Test analyse complète d'un CV."""
        text = "Senior Python developer avec 8 ans d'expérience. Master en informatique. Compétences: Python, FastAPI, Docker, PostgreSQL, AWS."
        result = self.analyzer.analyze(text)
        assert isinstance(result, ResumeAnalysis)
        assert "python" in result.skills
        assert result.experience_level == "senior"
        assert result.education_level == "master"
        assert result.confidence > 0
        assert result.extraction_method == "ai_local"

    def test_analyze_empty_text(self):
        """Test analyse avec texte vide."""
        result = self.analyzer.analyze("")
        assert result.confidence == 0.0
        assert result.extraction_method == "empty"
        assert result.skills == []

    def test_analyze_minimal_text(self):
        """Test analyse avec texte minimal."""
        result = self.analyzer.analyze("Bonjour")
        assert result.confidence >= 0
        assert isinstance(result.skills, list)