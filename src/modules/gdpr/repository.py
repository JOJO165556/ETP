"""Repository pour les opérations GDPR : export, suppression, consentement."""
from datetime import datetime, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.users.models import User, Profile
from src.modules.applications.models import Application
from src.modules.jobs.models import Job


class GDPRRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def export_user_data(self, user_id: str) -> dict:
        """Export complet des données d'un utilisateur (RGPD art. 20)."""
        user_result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {}

        profile_result = await self.session.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        apps_result = await self.session.execute(
            select(Application, Job.title, Job.company_id)
            .join(Job, Application.job_id == Job.id)
            .where(Application.candidate_id == user_id)
        )
        applications = []
        for app, job_title, company_id in apps_result.all():
            applications.append({
                "id": str(app.id),
                "job_title": job_title,
                "company_id": str(company_id),
                "stage": app.stage.value,
                "matching_score": float(app.matching_score) if app.matching_score else None,
                "applied_at": str(app.created_at) if hasattr(app, "created_at") else None,
            })

        return {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "profile": {
                "first_name": profile.first_name if profile else None,
                "last_name": profile.last_name if profile else None,
                "phone": profile.phone if profile else None,
                "skills": profile.skills if profile else [],
            } if profile else None,
            "applications": applications,
            "export_date": datetime.now(timezone.utc).isoformat(),
        }

    async def delete_user_data(self, user_id: str) -> dict:
        """Suppression complète des données d'un utilisateur (RGPD art. 17)."""
        user_result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {"deleted": False, "message": "Utilisateur non trouvé"}

        # Supprimer les candidatures
        await self.session.execute(
            delete(Application).where(Application.candidate_id == user_id)
        )

        # Supprimer le profil
        await self.session.execute(
            delete(Profile).where(Profile.user_id == user_id)
        )

        # Supprimer l'utilisateur
        await self.session.delete(user)
        await self.session.flush()

        return {"deleted": True, "message": "Données supprimées avec succès"}

    async def anonymize_user_data(self, user_id: str) -> dict:
        """Anonymisation des données (alternative à la suppression)."""
        user_result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            return {"anonymized": False, "message": "Utilisateur non trouvé"}

        user.email = f"anonymized_{user_id}@deleted.local"
        user.hashed_password = "DELETED"
        user.is_active = False

        profile_result = await self.session.execute(
            select(Profile).where(Profile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            profile.first_name = None
            profile.last_name = None
            profile.phone = None
            profile.cv_key = None
            profile.raw_address = None

        await self.session.flush()
        return {"anonymized": True, "message": "Données anonymisées avec succès"}
