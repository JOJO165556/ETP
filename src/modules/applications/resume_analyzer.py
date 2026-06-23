"""
Analyseur de CV basé sur des modèles locaux (Hugging Face).
Utilise MiniLM-L6-v2 pour la similarité sémantique et un pipeline NER pour l'extraction d'entités.
"""
import re
from typing import Optional
from dataclasses import dataclass, field

from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

# Seuil de confiance minimum pour accepter l'extraction IA
CONFIDENCE_THRESHOLD = 0.4

# Modèles Hugging Face utilisés
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
NER_MODEL = "dslim/bert-base-NER"

# Dictionnaire étendu de compétences techniques avec catégories
TECH_SKILLS_DB = {
    "python": ["python", "python3", "python2", "cpython", "pypy"],
    "javascript": ["javascript", "js", "ecmascript", "es6", "es2015"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "jdk", "jvm"],
    "react": ["react", "reactjs", "react.js"],
    "angular": ["angular", "angularjs", "angular.js"],
    "vue": ["vue", "vuejs", "vue.js"],
    "node": ["node", "nodejs", "node.js"],
    "fastapi": ["fastapi", "fast api"],
    "django": ["django"],
    "flask": ["flask"],
    "spring": ["spring", "springboot", "spring boot"],
    "postgresql": ["postgresql", "postgres", "psql"],
    "mysql": ["mysql", "mariadb"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "docker": ["docker", "dockerfile", "docker-compose"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "gcp": ["gcp", "google cloud", "bigquery", "cloud functions"],
    "azure": ["azure", "microsoft azure"],
    "git": ["git", "github", "gitlab", "bitbucket"],
    "ci/cd": ["ci/cd", "cicd", "pipeline", "jenkins", "github actions", "gitlab ci"],
    "machine learning": ["machine learning", "ml", "deep learning", "ia", "intelligence artificielle"],
    "sql": ["sql", "requêtes sql"],
    "html": ["html", "html5"],
    "css": ["css", "css3", "scss", "sass", "less"],
    "php": ["php"],
    "ruby": ["ruby", "ruby on rails", "rails"],
    "go": ["golang", "go"],
    "rust": ["rust"],
    "swift": ["swift", "swiftui"],
    "kotlin": ["kotlin"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp", ".net"],
    "scala": ["scala"],
    "r": [" r ", "r studio", "rstudio"],
    "data engineering": ["data engineering", "etl", "airflow", "spark", "kafka"],
    "devops": ["devops", "sre", "infrastructure"],
    "agile": ["agile", "scrum", "kanban"],
    "terraform": ["terraform", "infrastructure as code", "iac"],
    "ansible": ["ansible"],
    "elasticsearch": ["elasticsearch", "elastic", "kibana"],
    "graphql": ["graphql", "graph ql"],
    "rest": ["rest", "restapi", "api rest", "api"],
    "microservices": ["microservices", "microservices"],
    "linux": ["linux", "ubuntu", "debian", "centos"],
    "figma": ["figma"],
    "photoshop": ["photoshop"],
}

# Niveaux d'expérience
EXPERIENCE_KEYWORDS = {
    "senior": ["senior", "lead", "principal", "architect", "staff", "head of", "directeur", "responsable"],
    "mid": ["mid", "intermediate", "regular", "confirmé", "3-5 ans", "5 ans"],
    "junior": ["junior", "entry", "débutant", "0-2 ans", "1-2 ans", "2 ans"],
    "intern": ["intern", "stagiaire", "apprenti", "alternant", " étudiant"],
}

# Niveaux d'éducation
EDUCATION_KEYWORDS = {
    "phd": ["phd", "doctorat", "doctorate", "thèse", "recherche"],
    "master": ["master", "mastère", "msc", "meng", "mba", "deep learning"],
    "bachelor": ["licence", "bachelor", "bs", "ba", "ingénieur", "diplôme d'ingénieur"],
    "associate": ["associate", "demi-licence", "bts", "dut"],
    "high_school": ["bac", "high school", "lycée", "brevet"],
}

# Patterns regex pour les email, téléphone, etc.
EMAIL_PATTERN = re.compile(r'\b[\w.-]+@[\w.-]+\.\w+\b')
PHONE_PATTERN = re.compile(r'[\+]?[\d\s\-\(\)]{8,}')


@dataclass
class ResumeAnalysis:
    """Résultat de l'analyse d'un CV."""
    skills: list[str] = field(default_factory=list)
    experience_level: str = "unknown"
    education_level: str = "unknown"
    confidence: float = 0.0
    raw_entities: dict = field(default_factory=dict)
    extraction_method: str = "ai"


class LocalResumeAnalyzer:
    """
    Analyseur de CV utilisant des modèles locaux Hugging Face.
    
    - Sentence-transformers (MiniLM-L6-v2) pour la similarité sémantique
    - Transformers NER pour l'extraction d'entités nommées
    - Regex + dictionnaire pour les compétences techniques
    """

    def __init__(self):
        self._sentence_model = None
        self._ner_pipeline = None

    def _load_sentence_model(self):
        """Charge le modèle sentence-transformers en lazy loading."""
        if self._sentence_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Chargement du modèle sentence-transformers: %s", SENTENCE_TRANSFORMER_MODEL)
                self._sentence_model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
                logger.info("Modèle sentence-transformers chargé avec succès")
            except Exception as e:
                logger.error("Erreur chargement sentence-transformers: %s", e)
                raise
        return self._sentence_model

    def _load_ner_pipeline(self):
        """Charge le pipeline NER en lazy loading."""
        if self._ner_pipeline is None:
            try:
                from transformers import pipeline
                logger.info("Chargement du pipeline NER: %s", NER_MODEL)
                self._ner_pipeline = pipeline("ner", model=NER_MODEL, aggregation_strategy="simple")
                logger.info("Pipeline NER chargé avec succès")
            except Exception as e:
                logger.error("Erreur chargement pipeline NER: %s", e)
                raise
        return self._ner_pipeline

    def extract_skills(self, text: str) -> list[str]:
        """
        Extraction dynamique de compétences depuis le texte du CV.
        Combine NER + dictionnaire de compétences + similarité sémantique.
        """
        text_lower = text.lower()
        found_skills = set()

        # 1. Extraction par dictionnaire (rapide, fiable)
        for skill, variants in TECH_SKILLS_DB.items():
            for variant in variants:
                if variant in text_lower:
                    found_skills.add(skill)
                    break

        # 2. Extraction NER pour détecter les entités de type ORG/TECH
        try:
            ner_pipeline = self._load_ner_pipeline()
            # Tronquer le texte pour le NER (limite de 512 tokens)
            truncated = text[:2000]
            entities = ner_pipeline(truncated)
            for entity in entities:
                word = entity.get("word", "").lower().strip()
                entity_type = entity.get("entity_group", "")
                score = entity.get("score", 0)
                if score > 0.7 and entity_type in ("ORG", "MISC"):
                    # Vérifier si l'entité correspond à une compétence connue
                    for skill, variants in TECH_SKILLS_DB.items():
                        if word in variants or any(v in word for v in variants):
                            found_skills.add(skill)
                            break
        except Exception as e:
            logger.warning("Erreur extraction NER: %s", e)

        return sorted(list(found_skills))

    def extract_experience_level(self, text: str) -> str:
        """Détecte le niveau d'expérience depuis le texte du CV."""
        text_lower = text.lower()
        for level, keywords in EXPERIENCE_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    return level
        return "unknown"

    def extract_education_level(self, text: str) -> str:
        """Détecte le niveau d'éducation depuis le texte du CV."""
        text_lower = text.lower()
        for level, keywords in EDUCATION_KEYWORDS.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                    return level
        return "unknown"

    def compute_semantic_similarity(self, text1: str, text2: str) -> float:
        """
        Calcule la similarité sémantique entre deux textes
        en utilisant MiniLM-L6-v2.
        """
        try:
            model = self._load_sentence_model()
            embeddings = model.encode([text1, text2])
            # Cosine similarity
            from numpy import dot
            from numpy.linalg import norm
            sim = dot(embeddings[0], embeddings[1]) / (norm(embeddings[0]) * norm(embeddings[1]))
            return float(sim)
        except Exception as e:
            logger.warning("Erreur similarité sémantique: %s", e)
            return 0.0

    def analyze(self, text: str) -> ResumeAnalysis:
        """
        Analyse complète d'un CV.
        Retourne un ResumeAnalysis avec skills, niveaux et confiance.
        """
        if not text or not text.strip():
            return ResumeAnalysis(confidence=0.0, extraction_method="empty")

        skills = self.extract_skills(text)
        experience_level = self.extract_experience_level(text)
        education_level = self.extract_education_level(text)

        # Calcul de confiance basé sur le nombre d'éléments trouvés
        confidence_factors = []
        if skills:
            confidence_factors.append(min(len(skills) / 5.0, 1.0))
        if experience_level != "unknown":
            confidence_factors.append(0.3)
        if education_level != "unknown":
            confidence_factors.append(0.3)

        confidence = sum(confidence_factors) / max(len(confidence_factors), 1)

        return ResumeAnalysis(
            skills=skills,
            experience_level=experience_level,
            education_level=education_level,
            confidence=round(confidence, 3),
            extraction_method="ai_local"
        )


# Instance singleton pour usage dans les tâches Celery
_analyzer_instance: Optional[LocalResumeAnalyzer] = None


def get_resume_analyzer() -> LocalResumeAnalyzer:
    """Retourne l'instance singleton de l'analyseur."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = LocalResumeAnalyzer()
    return _analyzer_instance
