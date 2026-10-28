"""
Analyseur de CV utilisant l'API Gemini (distant et gratuit via AI Studio).
Remplace les modèles locaux Hugging Face pour réduire la charge serveur.
"""
import json
import re
from dataclasses import dataclass, field
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

# Fallback regex if AI is not configured or fails
_FALLBACK_SKILL_PATTERN = re.compile(
    r'\b(python|javascript|typescript|react[\s-]?native|react|angular|vue|fastapi|django|flask|spring|'
    r'postgresql|mysql|mongodb|redis|docker|kubernetes|aws|gcp|azure|'
    r'git|ci/cd|jenkins|terraform|ansible|graphql|rest|'
    r'machine learning|deep learning|nlp|data science|'
    r'java(?!script)|golang|rust|swift|kotlin|ruby|php|scala|'
    r'figma|photoshop|tailwind|sass|scss|css3?|html5?|'
    r'linux|bash|powershell|jira|agile|scrum|node\.?js)\b',
    re.IGNORECASE
)
SKILL_NORMALIZATION = {
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",
    "react-native": "react native",
    "reactnative": "react native",
    "nodejs": "node.js",
    "golang": "go",
    "typescript": "typescript",
    "ts": "typescript",
    "css3": "css",
    "html5": "html",
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "ml": "machine learning",
}
EXPERIENCE_KEYWORDS = {
    "senior": ["senior", "lead", "principal", "architect", "staff", "head of", "directeur", "responsable"],
    "mid": ["mid", "intermediate", "regular", "confirmé", "3-5 ans", "5 ans"],
    "junior": ["junior", "entry", "débutant", "0-2 ans", "1-2 ans", "2 ans"],
    "intern": ["intern", "stagiaire", "apprenti", "alternant", " étudiant"],
}
EDUCATION_KEYWORDS = {
    "phd": ["phd", "doctorat", "doctorate", "thèse", "recherche"],
    "master": ["master", "mastère", "msc", "meng", "mba", "deep learning"],
    "bachelor": ["licence", "bachelor", "bs", "ba", "ingénieur", "diplôme d'ingénieur"],
    "associate": ["associate", "demi-licence", "bts", "dut"],
    "high_school": ["bac", "baccalauréat", "high school", "lycée", "brevet"],
}

@dataclass
class ResumeAnalysis:
    """Résultat de l'analyse d'un CV."""
    skills: list[str] = field(default_factory=list)
    experience_level: str = "unknown"
    education_level: str = "unknown"
    confidence: float = 0.0
    raw_entities: dict = field(default_factory=dict)
    extraction_method: str = "ai"


class RemoteResumeAnalyzer:
    """
    Analyseur de CV utilisant l'API Gemini (google-genai) pour l'extraction intelligente.
    Retourne les compétences, le niveau d'expérience et d'éducation.
    """
    def __init__(self):
        from src.core.config import settings
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Client Gemini initialisé avec succès pour l'analyse de CV.")
            except ImportError:
                logger.warning("Package 'google-genai' manquant. Utilisation du fallback.")

    def _fallback_analysis(self, text: str) -> ResumeAnalysis:
        logger.info("Utilisation du fallback regex (API non configurée ou échec).")
        found_skills = set()
        matches = _FALLBACK_SKILL_PATTERN.findall(text)
        for match in matches:
            skill = match.lower().strip()
            skill = re.sub(r'\d+$', '', skill)
            skill = SKILL_NORMALIZATION.get(skill, skill)
            found_skills.add(skill)

        text_lower = text.lower()
        exp_level = "unknown"
        for level, keywords in EXPERIENCE_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                exp_level = level
                break

        edu_level = "unknown"
        for level, keywords in EDUCATION_KEYWORDS.items():
            if any(re.search(r'\b' + re.escape(kw) + r'\b', text_lower) for kw in keywords):
                edu_level = level
                break

        return ResumeAnalysis(
            skills=sorted(list(found_skills)),
            experience_level=exp_level,
            education_level=edu_level,
            confidence=0.3,
            extraction_method="regex_fallback"
        )

    def analyze(self, text: str) -> ResumeAnalysis:
        if not text or not text.strip():
            return ResumeAnalysis(confidence=0.0, extraction_method="empty")

        if not self.client:
            return self._fallback_analysis(text)

        try:
            from google.genai import types
            
            prompt = (
                "Tu es un parseur de CV expert. Ton but est d'extraire les informations "
                "clés du texte du CV suivant. Réponds UNIQUEMENT au format JSON avec le schéma demandé.\n\n"
                f"CV TEXT:\n{text[:10000]}\n"
            )
            
            # Use structured output for robust parsing
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "skills": types.Schema(
                                type=types.Type.ARRAY,
                                items=types.Schema(type=types.Type.STRING),
                                description="Liste des compétences techniques et soft skills extraites."
                            ),
                            "experience_level": types.Schema(
                                type=types.Type.STRING,
                                enum=["intern", "junior", "mid", "senior", "unknown"],
                                description="Niveau d'expérience professionnel global."
                            ),
                            "education_level": types.Schema(
                                type=types.Type.STRING,
                                enum=["high_school", "associate", "bachelor", "master", "phd", "unknown"],
                                description="Niveau d'études maximal atteint."
                            ),
                        },
                        required=["skills", "experience_level", "education_level"]
                    ),
                    temperature=0.1
                )
            )
            
            data = json.loads(response.text)
            
            # Normalize skills
            skills = data.get("skills", [])
            normalized_skills = set()
            for skill in skills:
                skill_lower = skill.lower().strip()
                skill_lower = SKILL_NORMALIZATION.get(skill_lower, skill_lower)
                normalized_skills.add(skill_lower)
                
            return ResumeAnalysis(
                skills=sorted(list(normalized_skills)),
                experience_level=data.get("experience_level", "unknown"),
                education_level=data.get("education_level", "unknown"),
                confidence=0.9,
                extraction_method="gemini_api"
            )
            
        except Exception as e:
            logger.error(f"Échec de l'appel API Gemini : {e}")
            return self._fallback_analysis(text)

# Singleton instance
_analyzer_instance = None

def get_resume_analyzer() -> RemoteResumeAnalyzer:
    """Retourne l'instance singleton de l'analyseur distant."""
    global _analyzer_instance
    if _analyzer_instance is None:
        _analyzer_instance = RemoteResumeAnalyzer()
    return _analyzer_instance

# Rétrocompatibilité avec les imports
CONFIDENCE_THRESHOLD = 0.4
