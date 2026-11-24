"""
Script de seed de démonstration - données fictives Togo / Afrique de l'Ouest.
Usage :
    python scripts/seed_demo.py

Variables d'environnement requises : DATABASE_URL (connexion PostgreSQL).
Le script est idempotent : il vérifie avant d'insérer.
"""
import asyncio
import os
import sys
import uuid
from pathlib import Path
from typing import Any

# Racine du projet
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from src.core.config import _normalize_postgres_url, settings
from src.core.security import get_password_hash
from src.modules.companies.models import Company
from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import User, UserRole

COMPANIES: list[dict[str, Any]] = [
    {
        "name": "EcoTech Lomé",
        "slug": "ecotech-lome",
        "siret": None,
    },
    {
        "name": "AfriPay Solutions",
        "slug": "afripay-solutions",
        "siret": None,
    },
    {
        "name": "SantéPlus Abidjan",
        "slug": "santeplus-abidjan",
        "siret": None,
    },
    {
        "name": "Sahel Logistique",
        "slug": "sahel-logistique",
        "siret": None,
    },
    {
        "name": "Dakar Code Academy",
        "slug": "dakar-code-academy",
        "siret": None,
    },
]

JOBS_DATA: list[dict[str, Any]] = [
    {
        "company_slug": "ecotech-lome",
        "title": "Ingénieur Agronome / Tech Agricole",
        "description": (
            "EcoTech Lomé développe des capteurs IoT solaires pour optimiser l'irrigation "
            "des cultures maraîchères au Togo. Nous recherchons un ingénieur agronome familier "
            "avec les outils numériques pour accompagner les coopératives agricoles de la Région Maritime."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Boulevard du 13 Janvier, Lomé, Togo",
        "lon": 1.2226,
        "lat": 6.1319,
        "required_skills": ["Agronomie", "IoT", "SIG", "Gestion de projet"],
    },
    {
        "company_slug": "ecotech-lome",
        "title": "Responsable Développement Commercial",
        "description": (
            "Développement des partenariats avec les ONG, bailleurs et coopératives agricoles "
            "au Togo, Bénin et Ghana. Mobilité régionale requise (permis B souhaité)."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Quartier Adidogomé, Lomé, Togo",
        "lon": 1.1680,
        "lat": 6.1720,
        "required_skills": ["Vente B2B", "Négociation", "Anglais professionnel", "Reporting"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Lead Développeur Python / FastAPI",
        "description": (
            "AfriPay conçoit des passerelles de paiement interconnectées aux opérateurs Mobile Money "
            "(Flooz, T-Money, Orange Money, MTN MoMo). Nous recrutons un Lead Dev Python senior pour "
            "concevoir des APIs à haute disponibilité (FastAPI, Redis, PostgreSQL, Docker)."
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Lomé, Togo",
        "lon": 1.2167,
        "lat": 6.1375,
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Mobile Money"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Spécialiste Conformité & Anti-Fraude",
        "description": (
            "Surveillance des transactions Mobile Money et conformité réglementaire BCEAO. "
            "Expérience en audit conformité ou gestion du risque financier exigée."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Airport Road, Accra, Ghana",
        "lon": -0.1740,
        "lat": 5.6050,
        "required_skills": ["Conformité", "Anti-Fraude", "AML/CFT", "Réglementation BCEAO"],
    },
    {
        "company_slug": "santeplus-abidjan",
        "title": "Infirmier diplômé d'État",
        "description": (
            "SantéPlus Abidjan recherche des infirmiers pour son réseau de centres de santé de proximité. "
            "Poste à pourvoir immédiatement, garde de nuit par roulement."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Cocody Angré, Abidjan, Côte d'Ivoire",
        "lon": -3.9870,
        "lat": 5.3890,
        "required_skills": ["Soins infirmiers", "Urgences", "Gestion des dossiers patients"],
    },
    {
        "company_slug": "santeplus-abidjan",
        "title": "Data Analyst Santé Publique",
        "description": (
            "Analyse des données épidémiologiques et des parcours de soins pour améliorer la prévention "
            "dans nos cliniques partenaires en Afrique de l'Ouest. Maîtrise de Python/R et Power BI."
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Plateau, Abidjan, Côte d'Ivoire",
        "lon": -4.0197,
        "lat": 5.3250,
        "required_skills": ["Python", "R", "Power BI", "SQL", "Santé publique"],
    },
    {
        "company_slug": "dakar-code-academy",
        "title": "Formateur en Programmation (Python / Scratch)",
        "description": (
            "Dakar Code Academy forme les jeunes et les professionnels aux métiers du numérique. "
            "Nous recherchons un pédagogue passionné pour animer des bootcamps de développement web et IA."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Mermoz, Dakar, Sénégal",
        "lon": -17.4720,
        "lat": 14.7110,
        "required_skills": ["Pédagogie", "Python", "JavaScript", "Git", "Mentorat"],
    },
    {
        "company_slug": "dakar-code-academy",
        "title": "Développeur Mobile React Native",
        "description": (
            "Conception de l'application mobile d'apprentissage en ligne de l'académie, "
            "accessible hors-ligne pour les zones à faible connectivité."
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Plateau, Dakar, Sénégal",
        "lon": -17.4380,
        "lat": 14.6720,
        "required_skills": ["React Native", "TypeScript", "Offline-first", "REST APIs"],
    },
    {
        "company_slug": "sahel-logistique",
        "title": "Coordinateur Flotte & Transit Portuaire",
        "description": (
            "Gestion du transit maritime et ferroviaire depuis le Port Autonome de Cotonou vers les "
            "pays enclavés (Niger, Burkina). Nous cherchons un responsable logistique rigoureux avec "
            "au moins 3 ans d'expérience en milieu portuaire ou douanier."
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Zone Portuaire, Cotonou, Bénin",
        "lon": 2.4280,
        "lat": 6.3650,
        "required_skills": ["Logistique portuaire", "Douanes", "Transit", "Gestion de flotte"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Chef de Projet Produit (Paiements mobiles Afrique)",
        "description": (
            "Coordination du déploiement de la passerelle AfriPay auprès des marchands français "
            "ciblant la diaspora ouest-africaine. Taux de télétravail partiel, déplacements à Lomé et Abidjan."
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Rue de la Boétie, Paris 8e, France",
        "lon": 2.3120,
        "lat": 48.8730,
        "required_skills": ["Product Management", "Fintech", "Agile/Scrum", "API REST"],
    },
]

RECRUITERS: list[dict[str, str]] = [
    {
        "email": "recruteur.ecotech@etp-demo.tg",
        "first_name": "Koffi",
        "last_name": "Agbodjan",
        "company_slug": "ecotech-lome",
    },
    {
        "email": "recruteur.afripay@etp-demo.tg",
        "first_name": "Ablavi",
        "last_name": "Mensah",
        "company_slug": "afripay-solutions",
    },
    {
        "email": "rh@santeplus-ci.com",
        "first_name": "Amadou",
        "last_name": "Koné",
        "company_slug": "santeplus-abidjan",
    },
    {
        "email": "talents@dakarcode.sn",
        "first_name": "Fatou",
        "last_name": "Diop",
        "company_slug": "dakar-code-academy",
    },
    {
        "email": "recrutement@sahel-logistique.bj",
        "first_name": "Codjo",
        "last_name": "Dossou",
        "company_slug": "sahel-logistique",
    },
]

CANDIDATES: list[dict[str, Any]] = [
    {
        "email": "kodjo.cand@etp-demo.tg",
        "first_name": "Kodjo",
        "last_name": "Lawson",
        "raw_address": "Lomé, Togo",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
    },
    {
        "email": "afi.cand@etp-demo.tg",
        "first_name": "Afi",
        "last_name": "Gbégan",
        "raw_address": "Aného, Togo",
        "skills": ["Agronomie", "SIG", "Gestion de projet", "Excel avancé"],
    },
    {
        "email": "yao.cand@etp-demo.tg",
        "first_name": "Yao",
        "last_name": "Kombaté",
        "raw_address": "Kara, Togo",
        "skills": ["React Native", "TypeScript", "JavaScript", "HTML/CSS"],
    },
    {
        "email": "aminata.cand@etp-demo.sn",
        "first_name": "Aminata",
        "last_name": "Bâ",
        "raw_address": "Dakar, Sénégal",
        "skills": ["Pédagogie", "Python", "Scratch", "Communication"],
    },
    {
        "email": "bakary.cand@etp-demo.ci",
        "first_name": "Bakary",
        "last_name": "Traoré",
        "raw_address": "Abidjan, Côte d'Ivoire",
        "skills": ["Soins infirmiers", "Urgences", "Premiers secours"],
    },
    {
        "email": "charlotte.cand@etp-demo.bj",
        "first_name": "Charlotte",
        "last_name": "Adovi",
        "raw_address": "Cotonou, Bénin",
        "skills": ["Logistique portuaire", "Douanes", "Transit", "SAP"],
    },
]

DEMO_PASSWORD = "Demo@ETP2026!"


def _make_point(lon: float, lat: float) -> str:
    return f"SRID=4326;POINT({lon} {lat})"


async def _get_or_create_company(session: AsyncSession, data: dict[str, Any]) -> Company:
    res = await session.execute(select(Company).where(Company.slug == str(data["slug"])))
    company = res.scalar_one_or_none()
    if not company:
        company = Company(
            id=str(uuid.uuid4()),
            name=str(data["name"]),
            slug=str(data["slug"]),
            siret=data.get("siret"),
            is_active=True,
        )
        session.add(company)
        await session.flush()
        print(f"  [CREE] Entreprise : {company.name}")
    else:
        print(f"  [EXISTE] Entreprise : {company.name}")
    return company


async def _get_or_create_job(session: AsyncSession, company: Company, data: dict[str, Any]) -> Job:
    res = await session.execute(
        select(Job).where(Job.title == str(data["title"]), Job.company_id == str(company.id))
    )
    job = res.scalar_one_or_none()
    if not job:
        point = _make_point(float(data["lon"]), float(data["lat"])) if data.get("lon") else None
        job = Job(
            id=str(uuid.uuid4()),
            company_id=str(company.id),
            title=str(data["title"]),
            description=str(data["description"]),
            status=JobStatus(str(data["status"])),
            is_remote=bool(data.get("is_remote", False)),
            formatted_address=str(data["formatted_address"]) if data.get("formatted_address") else None,
            required_skills=list(data.get("required_skills", [])),
        )
        if point:
            job.job_location = point  # type: ignore[assignment]
        session.add(job)
        await session.flush()
        print(f"    [CREE] Offre : {job.title}")
    else:
        print(f"    [EXISTE] Offre : {job.title}")
    return job


async def _get_or_create_user(
    session: AsyncSession,
    email: str,
    first_name: str,
    last_name: str,
    role: UserRole,
    company_id: str | None = None,
    raw_address: str | None = None,
    skills: list[str] | None = None,
) -> User:
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role=role,
            is_active=True,
            is_verified=True,
            company_id=company_id,
        )
        session.add(user)
        await session.flush()

        from src.modules.users.models import Profile
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=str(user.id),
            first_name=first_name,
            last_name=last_name,
            raw_address=raw_address,
            skills=skills or [],
        )
        session.add(profile)
        await session.flush()
        print(f"  [CREE] Utilisateur : {email} ({role.value})")
    else:
        print(f"  [EXISTE] Utilisateur : {email}")
    return user


async def seed():
    raw_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    db_url = _normalize_postgres_url(raw_url)

    engine = create_async_engine(db_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        print("\n--- Seed : Entreprises ---")
        companies: dict[str, Company] = {}
        for c in COMPANIES:
            slug = str(c["slug"])
            companies[slug] = await _get_or_create_company(session, c)

        print("\n--- Seed : Offres d'emploi ---")
        for j in JOBS_DATA:
            company_slug = str(j["company_slug"])
            company = companies[company_slug]
            await _get_or_create_job(session, company, j)

        print("\n--- Seed : Recruteurs de démo ---")
        for r in RECRUITERS:
            recruiter_slug = r["company_slug"]
            company = companies[recruiter_slug]
            await _get_or_create_user(
                session,
                email=r["email"],
                first_name=r["first_name"],
                last_name=r["last_name"],
                role=UserRole.RECRUITER,
                company_id=str(company.id),
            )

        print("\n--- Seed : Candidats de démo ---")
        for cand in CANDIDATES:
            raw_skills = cand.get("skills")
            skills_list = [str(s) for s in raw_skills] if isinstance(raw_skills, list) else []
            addr = str(cand["raw_address"]) if cand.get("raw_address") else None
            await _get_or_create_user(
                session,
                email=str(cand["email"]),
                first_name=str(cand["first_name"]),
                last_name=str(cand["last_name"]),
                role=UserRole.CANDIDATE,
                raw_address=addr,
                skills=skills_list,
            )

        await session.commit()

    await engine.dispose()
    print("\n[OK] Seed terminé avec succès.\n")
    print("Comptes de démo créés (mot de passe : Demo@ETP2026!) :")
    print("  Recruteurs :")
    for r in RECRUITERS:
        print(f"    {r['email']} - {r['company_slug']}")
    print("  Candidats :")
    for cand in CANDIDATES:
        print(f"    {cand['email']}")


if __name__ == "__main__":
    asyncio.run(seed())
