"""Fixtures pytest pour les tests d'intégration."""

import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Chargement optionnel des variables d'environnement
try:
    from dotenv import load_dotenv
    load_dotenv(".env.test", override=True)
except ImportError:
    pass  # dotenv non disponible en CI

from src.core.config import settings
from src.core.database import Base, get_db
from src.core.security import get_password_hash
from src.main import app
from src.modules.applications.models import Application, ApplicationStage
from src.modules.companies.models import Company
from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import User, UserRole


def _get_test_database_url() -> str:
    raw = os.environ.get("TEST_DATABASE_URL")
    if raw and raw.strip():
        from src.core.config import _normalize_postgres_url
        return _normalize_postgres_url(raw)
    return str(settings.DATABASE_URL)


TEST_DATABASE_URL = _get_test_database_url()


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Moteur PostgreSQL partagé : schéma créé une seule fois avec toutes les structures avancées."""
    # statement_cache_size=0 : désactive le cache de requêtes préparées d'asyncpg.
    # Après drop_all + create_all les OIDs des types ENUM (userrole, jobstatus…)
    # changent ; le cache conserve les anciens OIDs → "cache lookup failed for type".
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"statement_cache_size": 0},
    )
    async with engine.begin() as conn:
        await conn.execute(
            text("DROP MATERIALIZED VIEW IF EXISTS mv_company_recruitment_kpis CASCADE;")
        )
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

        # Extension btree_gist et contrainte d'exclusion GiST sur interviews
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist;"))
        await conn.execute(
            text("""
            CREATE OR REPLACE FUNCTION interview_timerange(st timestamptz, duration integer)
            RETURNS tstzrange AS $$
            BEGIN
                RETURN tstzrange(st, st + make_interval(mins => duration));
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        """)
        )
        await conn.execute(
            text(
                "ALTER TABLE interviews DROP CONSTRAINT IF EXISTS no_overlapping_interviewer_schedule;"
            )
        )
        await conn.execute(
            text("""
            ALTER TABLE interviews
            ADD CONSTRAINT no_overlapping_interviewer_schedule
            EXCLUDE USING gist (
                interviewer_id WITH =,
                interview_timerange(scheduled_at, duration_minutes) WITH &&
            ) WHERE (status = 'SCHEDULED');
        """)
        )

        # Trigger d'historisation automatique de stage sur applications
        await conn.execute(
            text("""
            CREATE OR REPLACE FUNCTION log_application_stage_change()
            RETURNS TRIGGER AS $$
            BEGIN
                IF OLD.stage IS DISTINCT FROM NEW.stage THEN
                    INSERT INTO application_stage_history (id, application_id, from_stage, to_stage, changed_by_user_id, reason, created_at)
                    VALUES (gen_random_uuid(), NEW.id, OLD.stage, NEW.stage, NEW.modified_by, NULL, NOW());
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)
        )
        await conn.execute(
            text("DROP TRIGGER IF EXISTS trigger_application_stage_history ON applications;")
        )
        await conn.execute(
            text("""
            CREATE TRIGGER trigger_application_stage_history
            AFTER UPDATE OF stage ON applications
            FOR EACH ROW
            EXECUTE FUNCTION log_application_stage_change();
        """)
        )

        # Colonne FTS générée search_vector sur jobs et index GIN
        await conn.execute(
            text("""
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, ''))
            ) STORED;
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_jobs_search_vector_gin
            ON jobs USING GIN (search_vector);
        """)
        )

        # Vue matérialisée mv_company_recruitment_kpis et index unique
        await conn.execute(
            text("""
            CREATE MATERIALIZED VIEW IF NOT EXISTS mv_company_recruitment_kpis AS
            SELECT
                j.company_id,
                COUNT(DISTINCT j.id) AS total_jobs,
                COUNT(DISTINCT CASE WHEN j.status::text IN ('ACTIVE', 'active') THEN j.id END) AS active_jobs,
                COUNT(DISTINCT a.id) AS total_applications,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('APPLIED', 'applied') THEN a.id END) AS stage_applied_count,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('SCREENING', 'screening') THEN a.id END) AS stage_screening_count,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('INTERVIEW', 'interview') THEN a.id END) AS stage_interview_count,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('OFFER', 'offer') THEN a.id END) AS stage_offer_count,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('HIRED', 'hired') THEN a.id END) AS stage_hired_count,
                COUNT(DISTINCT CASE WHEN a.stage::text IN ('REJECTED', 'rejected') THEN a.id END) AS stage_rejected_count,
                ROUND(AVG(a.matching_score)::numeric, 2) AS avg_match_score,
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (sh.created_at - a.created_at)) / 86400)
                    FILTER (WHERE sh.to_stage::text IN ('HIRED', 'hired'))::numeric,
                    1
                ) AS avg_time_to_hire_days,
                NOW() AS refreshed_at
            FROM jobs j
            LEFT JOIN applications a ON a.job_id = j.id
            LEFT JOIN application_stage_history sh ON sh.application_id = a.id AND sh.to_stage::text IN ('HIRED', 'hired')
            GROUP BY j.company_id;
        """)
        )
        await conn.execute(
            text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_company_kpis_company_id
            ON mv_company_recruitment_kpis (company_id);
        """)
        )

    yield engine
    async with engine.begin() as conn:
        await conn.execute(
            text("DROP MATERIALIZED VIEW IF EXISTS mv_company_recruitment_kpis CASCADE;")
        )
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def session_factory(db_engine):
    """Factory de sessions partagée pour la session de tests."""
    return async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)


# Nettoyage entre chaque test
@pytest_asyncio.fixture(autouse=True)
async def clean_db(session_factory):
    """Tronque toutes les tables avant chaque test pour garantir l'isolation."""
    async with session_factory() as session:
        await session.execute(
            text(
                "TRUNCATE TABLE interviews, application_notes, application_stage_history, "
                "applications, jobs, users, companies RESTART IDENTITY CASCADE"
            )
        )
        await session.commit()


# Session de test par fonction
@pytest_asyncio.fixture
async def db(session_factory):
    """Session de test fonctionnelle."""
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession):
    """Client HTTP de test utilisant la session de test."""

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# Données de test
@pytest_asyncio.fixture
async def test_company(db: AsyncSession):
    """Entreprise de test."""
    company = Company(name="Test Company", slug="test-company", siret="12345678900001")
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@pytest_asyncio.fixture
async def test_user_recruiter(db: AsyncSession, test_company):
    """Recruteur de test."""
    user = User(
        email="recruiter@test.com",
        hashed_password=get_password_hash("password123"),
        role=UserRole.RECRUITER,
        is_active=True,
        is_verified=True,
        company_id=str(test_company.id),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_candidate(db: AsyncSession):
    """Candidat de test."""
    user = User(
        email="candidate@test.com",
        hashed_password=get_password_hash("password123"),
        role=UserRole.CANDIDATE,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_job(db: AsyncSession, test_company):
    """Offre d'emploi de test."""
    job = Job(
        company_id=str(test_company.id),
        title="Software Engineer",
        description="We are looking for a talented software engineer with Python and FastAPI.",
        status=JobStatus.ACTIVE,
        is_remote=True,
        required_skills=["Python", "FastAPI", "PostgreSQL"],
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@pytest_asyncio.fixture
async def test_application(db: AsyncSession, test_job, test_user_candidate):
    """Candidature de test."""
    application = Application(
        job_id=str(test_job.id),
        candidate_id=str(test_user_candidate.id),
        stage=ApplicationStage.APPLIED,
        matching_score=85.5,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application
