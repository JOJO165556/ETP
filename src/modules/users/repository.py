from uuid import UUID
from typing import Sequence
from sqlalchemy import update, select
from sqlalchemy.orm import selectinload
from src.core.repository import BaseAsyncRepository
from src.modules.users.models import Profile, User, UserRole, Experience, Formation
from src.modules.applications.models import Application
from src.modules.jobs.models import Job


class UserProfileRepository(BaseAsyncRepository[Profile]):
    def __init__(self, session):
        # Initialisation de la classe parente avec le modèle Profile et la session
        super().__init__(Profile, session)

    async def get_by_user_id(self, user_id: str) -> Profile | None:
        """
        Récupère le profil d'un utilisateur par son user_id
        """
        query = select(self.model).where(self.model.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def update_by_user_id(self, user_id: str, data: dict) -> Profile | None:
        """Met à jour le profil via le user_id"""
        query = (
            update(self.model)
            .where(self.model.user_id == user_id)
            .values(**data)
            .execution_options(synchronize_session="fetch")
        )
        await self.session.execute(query)
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def update_cv_key(self, user_id: str, cv_key: str) -> Profile | None:
        """
        Met à jour ou ajoute la clé de stockage du CV pour un utilisateur spécifique
        """
        query = (
            update(self.model)
            .where(self.model.user_id == user_id)
            .values(cv_key=cv_key)
            .returning(self.model)
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.scalar_one_or_none()

class UserRepository(BaseAsyncRepository[User]):
    def __init__(self, session):
        super().__init__(User, session)

    async def get(self, id: UUID | str) -> User | None:
        """Récupère un utilisateur avec son profil préparé (évite le lazy
        loading async pendant la sérialisation : MissingGreenlet)."""
        query = (
            select(self.model)
            .options(
                selectinload(User.profile).selectinload(Profile.experiences),
                selectinload(User.profile).selectinload(Profile.formations),
            )
            .where(
                self.model.id == id, self.model.is_deleted.is_(False)
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        query = select(self.model).where(self.model.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_firebase_uid(self, firebase_uid: str) -> User | None:
        query = select(self.model).where(self.model.firebase_uid == firebase_uid)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_candidates(
        self, skip: int = 0, limit: int = 50, search: str | None = None
    ) -> Sequence[User]:
        """Vivier : candidats actifs, non supprimés, avec profil préchargé.
        Sans filtrage multi-tenant (utilisé par superadmin et par compatibilité)."""
        query = (
            select(self.model)
            .options(
                selectinload(User.profile).selectinload(Profile.experiences),
                selectinload(User.profile).selectinload(Profile.formations),
            )
            .where(self.model.role == UserRole.CANDIDATE)
            .where(self.model.is_active.is_(True))
            .where(self.model.is_deleted.is_(False))
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if search:
            like = f"%{search.strip()}%"
            query = query.where(
                self.model.email.ilike(like)
                | self.model.profile.has(Profile.first_name.ilike(like))
                | self.model.profile.has(Profile.last_name.ilike(like))
            )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_candidates_tenant(
        self,
        company_id: str,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
    ) -> Sequence[User]:
        """Vivier filtré par tenant : candidats ayant au moins une candidature
        sur une offre (Job) rattachée à l'entreprise donnée."""
        candidate_subq = (
            select(Application.candidate_id)
            .distinct()
            .join(Job, Application.job_id == Job.id)
            .where(
                Application.is_deleted.is_(False),
                Job.is_deleted.is_(False),
                Job.company_id == company_id,
            )
            .subquery()
        )
        query = (
            select(self.model)
            .options(
                selectinload(User.profile).selectinload(Profile.experiences),
                selectinload(User.profile).selectinload(Profile.formations),
            )
            .where(self.model.role == UserRole.CANDIDATE)
            .where(self.model.is_active.is_(True))
            .where(self.model.is_deleted.is_(False))
            .where(self.model.id.in_(select(candidate_subq.c.candidate_id)))
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if search:
            like = f"%{search.strip()}%"
            query = query.where(
                self.model.email.ilike(like)
                | self.model.profile.has(Profile.first_name.ilike(like))
                | self.model.profile.has(Profile.last_name.ilike(like))
            )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create(self, data: dict) -> User:
        user = User(**data)
        self.session.add(user)
        await self.session.flush()
        
        # Création automatique du profil
        profile = Profile(user_id=user.id)
        self.session.add(profile)
        await self.session.flush()
        
        return user

class ExperienceRepository(BaseAsyncRepository[Experience]):
    """CRUD des expériences professionnelles d'un candidat."""
    def __init__(self, session):
        super().__init__(Experience, session)

    async def list_by_profile(self, profile_id: str) -> Sequence[Experience]:
        query = (
            select(self.model)
            .where(
                self.model.profile_id == profile_id,
                self.model.is_deleted.is_(False),
            )
            .order_by(self.model.ordre.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()


class FormationRepository(BaseAsyncRepository[Formation]):
    """CRUD des formations / diplômes d'un candidat."""
    def __init__(self, session):
        super().__init__(Formation, session)

    async def list_by_profile(self, profile_id: str) -> Sequence[Formation]:
        query = (
            select(self.model)
            .where(
                self.model.profile_id == profile_id,
                self.model.is_deleted.is_(False),
            )
            .order_by(self.model.ordre.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()
