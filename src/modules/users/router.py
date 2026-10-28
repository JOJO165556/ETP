from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.core.storage import AsyncStorageService
from src.modules.auth.dependencies import get_current_user, require_roles, tenant_company_id
from src.modules.users.models import User, UserRole, Profile
from src.modules.users.repository import (
    UserProfileRepository,
    UserRepository,
    ExperienceRepository,
    FormationRepository,
)
from src.modules.users.schemas import (
    ProfileResponse,
    UserResponse,
    UserCreate,
    UserAdminCreate,
    UserUpdate,
    UserMeUpdate,
    UserBriefResponse,
    ExperienceResponse,
    ExperienceCreate,
    ExperienceUpdate,
    ExperienceResume,
    FormationResponse,
    FormationCreate,
    FormationUpdate,
    FormationResume,
)
from src.modules.users.services import UserService
from src.modules.applications.models import Application
from src.modules.jobs.models import Job

profile_router = APIRouter(prefix="/profile")

_SUPERADMIN = require_roles(UserRole.SUPERADMIN)
_CANDIDATE_OR_ADMIN = require_roles(UserRole.CANDIDATE, UserRole.SUPERADMIN)
_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
_CANDIDATE_ONLY = require_roles(UserRole.CANDIDATE)
_ANY_AUTHENTICATED = require_roles(
    UserRole.CANDIDATE, UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN
)

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5 Mo


async def _candidate_visible_by_tenant(
    current_user: User,
    candidate_id: str,
    db: AsyncSession,
) -> User:
    """
    Vérifie que le candidat demandé appartient au périmètre multi-tenant du
    demandeur. Un candidat est visible par un recruteur/company_admin si et
    seulement s'il a au moins une candidature (Application) passée ou en cours
    sur une offre (Job) rattachée à l'entreprise du demandeur.

    Retourne le User si la visibilité est établie, provoque sinon une 403.
    """
    if current_user.role == UserRole.SUPERADMIN:
        return current_user  # superadmin voit tout (pas d'isolation)

    company_id = tenant_company_id(current_user)
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ces données multi-tenant.",
        )

    # Le candidat doit avoir au moins une application sur une job de l'entreprise
    has_access_result = await db.execute(
        select(Application.candidate_id)
        .join(Job, Application.job_id == Job.id)
        .where(
            Application.candidate_id == candidate_id,
            Job.company_id == company_id,
            not Application.is_deleted,
            not Job.is_deleted,
        )
        .limit(1)
    )
    candidate_ids = {str(row[0]) for row in has_access_result.fetchall()}
    if candidate_id not in candidate_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ces données multi-tenant.",
        )

    user_result = await db.execute(select(User).where(User.id == candidate_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidat introuvable.")
    return user


@profile_router.post(
    "/upload-cv",
    response_model=ProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Téléverser un CV candidat (PDF, max 5 Mo)",
)
async def upload_candidate_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """
    Téléverse le CV d'un candidat (PDF uniquement, max 5 Mo) vers MinIO
    et associe la clé de stockage à son profil.

    Accès : CANDIDATE, SUPERADMIN uniquement.
    L'identité est extraite depuis le JWT — aucun paramètre utilisateur côté client.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Seuls les fichiers PDF sont acceptés pour l'analyse ATS",
        )

    # Vérification du magic number (signature binaire du fichier)
    header = await file.read(5)
    if not header.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier n'est pas un document PDF valide.",
        )
    await file.seek(0)

    # Lecture partielle pour contrôle de taille sans charger tout en RAM
    contents = await file.read(MAX_CV_SIZE_BYTES + 1)
    if len(contents) > MAX_CV_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La taille du CV ne doit pas dépasser 5 Mo.",
        )
    # Remise en position pour que le service de stockage puisse relire le stream
    await file.seek(0)

    storage_service = AsyncStorageService()
    profile_repo = UserProfileRepository(db)

    try:
        file_key = await storage_service.upload_cv(file)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur lors du transfert vers le service de stockage : {exc}",
        ) from exc

    from src.modules.users.tasks import process_candidate_cv

    # Déclenchement de l'extraction par IA (OCR/NLP) en tâche de fond (Celery)
    process_candidate_cv.delay(str(current_user.id), file_key)

    updated_profile = await profile_repo.update_by_user_id(
        user_id=str(current_user.id),
        data={
            "cv_key": file_key
            # Les "skills" seront ajoutées par le worker Celery
        }
    )

    if not updated_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil utilisateur introuvable",
        )

    return updated_profile


@profile_router.get(
    "/cv/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Obtenir le lien signé du CV d'un candidat",
)
async def get_candidate_cv_link(
    user_id: str,
    current_user: User = Depends(_ANY_AUTHENTICATED),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Génère une URL signée temporaire (1 heure) pour accéder au CV d'un candidat.

    Règles de possession :
    - CANDIDATE : uniquement son propre CV (current_user.id == user_id) ;
    - RECRUITER / COMPANY_ADMIN : uniquement les candidats rattachés à une
      offre de son entreprise (isolation multi-tenant) ;
    - SUPERADMIN : accès global.
    Toute autre combinaison renvoie 403.
    """
    if current_user.role == UserRole.SUPERADMIN:
        # superadmin : pas de filtrage multi-tenant
        pass
    elif current_user.role == UserRole.CANDIDATE:
        if str(current_user.id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé à ce fichier.",
            )
    else:
        await _candidate_visible_by_tenant(current_user, user_id, db)

    profile_repo = UserProfileRepository(db)
    profile = await profile_repo.get_by_user_id(user_id)

    if not profile or not profile.cv_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ce candidat n'a pas encore téléversé de CV",
        )

    storage_service = AsyncStorageService()
    try:
        secure_url = await storage_service.generate_presigned_url(
            file_key=profile.cv_key,
            expires_in=3600,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur lors de la génération du lien sécurisé : {exc}",
        ) from exc

    return {"download_url": secure_url}


# Routeur principal du module utilisateurs
router = APIRouter(prefix="/users", tags=["Utilisateurs"])


def _to_brief(user: User, profile: Profile | None) -> UserBriefResponse:
    prenom = (profile.first_name if profile else None) or ""
    nom = (profile.last_name if profile else None) or ""
    nom_complet = f"{prenom} {nom}".strip() or None

    experiences = []
    if profile and profile.experiences:
        experiences = [
            ExperienceResume(
                poste=exp.poste,
                entreprise=exp.entreprise,
                type_contrat=exp.type_contrat,
                date_debut=exp.date_debut,
                date_fin=exp.date_fin,
                en_cours=exp.en_cours,
                description=exp.description,
            )
            for exp in sorted(
                profile.experiences,
                key=lambda e: (e.date_debut or date.min),
                reverse=True,
            )
        ]

    formations = []
    if profile and profile.formations:
        formations = [
            FormationResume(
                diplome=f.diplome,
                etablissement=f.etablissement,
                domaine=f.domaine,
                annee=f.annee,
            )
            for f in sorted(profile.formations, key=lambda x: (x.annee or 0), reverse=True)
        ]

    return UserBriefResponse(
        id=user.id,
        email=user.email,
        nom_complet=nom_complet,
        localisation=profile.raw_address if profile else None,
        skills=list(profile.skills or []) if profile else [],
        has_cv=bool(profile and profile.cv_key),
        profil_public=profile.is_profile_public if profile else True,
        recherchable=profile.is_searchable if profile else True,
        created_at=user.created_at,
        experiences=experiences,
        formations=formations,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Inscription publique d'un candidat")
async def register_candidate(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Inscription publique pour les candidats.
    Le rôle est forcé à CANDIDATE.
    """
    user_in.role = UserRole.CANDIDATE
    service = UserService(db)
    user = await service.register_user(user_in)
    await db.commit() # Commit transaction
    return user


@router.post("/admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Création d'un utilisateur par un Superadmin")
async def create_user_by_admin(
    user_in: UserAdminCreate, 
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Création d'un utilisateur (ex: recruteur, admin entreprise) par un superadmin.
    """
    service = UserService(db)
    user = await service.register_user(user_in)
    await db.commit()
    return user


@router.get("/me", response_model=UserResponse, summary="Obtenir son propre profil")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Récupère le profil de l'utilisateur connecté via son Token JWT.
    """
    repo = UserRepository(db)
    user = await repo.get(str(current_user.id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé."
        )
    return user


@router.patch("/me", response_model=UserResponse, summary="Modifier son propre profil")
async def update_my_profile(
    data_in: UserMeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Permet à l'utilisateur connecté de modifier ses informations et son profil.
    """
    service = UserService(db)
    user = await service.update_me(
        str(current_user.id), data_in, modified_by=str(current_user.id)
    )
    await db.commit()
    return user


async def _get_owned_profile(user: User, db: AsyncSession) -> Profile:
    """Profil du candidat connecté, garantit la possession avant CRUD parcours."""
    profile_repo = UserProfileRepository(db)
    profile = await profile_repo.get_by_user_id(str(user.id))
    if not profile:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun profil candidat associé à ce compte.",
        )
    return profile


@router.get("/me/experiences", response_model=list[ExperienceResponse], summary="Lister ses expériences professionnelles")
async def list_my_experiences(
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = ExperienceRepository(db)
    result = await repo.list_by_profile(str(profile.id))
    return sorted(result, key=lambda e: (e.date_debut or date.min))


@router.post("/me/experiences", response_model=ExperienceResponse, status_code=status.HTTP_201_CREATED, summary="Ajouter une expérience professionnelle")
async def create_my_experience(
    data_in: ExperienceCreate,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    if data_in.date_fin and data_in.date_fin < data_in.date_debut:
        raise HTTPException(status_code=422, detail="La date de fin précède la date de début.")
    profile = await _get_owned_profile(current_user, db)
    repo = ExperienceRepository(db)
    exp = await repo.create(
        {**data_in.model_dump(), "profile_id": str(profile.id)}
    )
    await db.commit()
    return exp


@router.patch("/me/experiences/{experience_id}", response_model=ExperienceResponse, summary="Modifier une expérience professionnelle")
async def update_my_experience(
    experience_id: str,
    data_in: ExperienceUpdate,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = ExperienceRepository(db)
    exp = await repo.get(experience_id)
    if not exp or str(exp.profile_id) != str(profile.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expérience introuvable.")
    if data_in.en_cours:
        data_in = data_in.model_copy(update={"date_fin": None})
    updated = await repo.update(exp.id, data_in.model_dump(exclude_unset=True))
    await db.commit()
    return updated


@router.delete("/me/experiences/{experience_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Supprimer une expérience professionnelle")
async def delete_my_experience(
    experience_id: str,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = ExperienceRepository(db)
    exp = await repo.get(experience_id)
    if not exp or str(exp.profile_id) != str(profile.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expérience introuvable.")
    await repo.soft_delete(exp.id)
    await db.commit()


@router.get("/me/formations", response_model=list[FormationResponse], summary="Lister ses formations / diplômes")
async def list_my_formations(
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = FormationRepository(db)
    result = await repo.list_by_profile(str(profile.id))
    return sorted(result, key=lambda f: (f.annee or 0), reverse=True)


@router.post("/me/formations", response_model=FormationResponse, status_code=status.HTTP_201_CREATED, summary="Ajouter une formation / un diplôme")
async def create_my_formation(
    data_in: FormationCreate,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = FormationRepository(db)
    formation = await repo.create(
        {**data_in.model_dump(), "profile_id": str(profile.id)}
    )
    await db.commit()
    return formation


@router.patch("/me/formations/{formation_id}", response_model=FormationResponse, summary="Modifier une formation / un diplôme")
async def update_my_formation(
    formation_id: str,
    data_in: FormationUpdate,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = FormationRepository(db)
    formation = await repo.get(formation_id)
    if not formation or str(formation.profile_id) != str(profile.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable.")
    updated = await repo.update(formation.id, data_in.model_dump(exclude_unset=True))
    await db.commit()
    return updated


@router.delete("/me/formations/{formation_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Supprimer une formation / un diplôme")
async def delete_my_formation(
    formation_id: str,
    current_user: User = Depends(_CANDIDATE_ONLY),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_owned_profile(current_user, db)
    repo = FormationRepository(db)
    formation = await repo.get(formation_id)
    if not formation or str(formation.profile_id) != str(profile.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable.")
    await repo.soft_delete(formation.id)
    await db.commit()


@router.get("", response_model=list[UserBriefResponse], summary="Lister le vivier de candidats")
async def list_candidates(
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """Vivier de talents (recruteur/company_admin/superadmin). Ne renvoie que
    les candidats CANDIDATE actifs, respectant leur confidentialité
    (profil_public / recherchable) et l'isolation multi-tenant :
    un recruteur ne voit que les candidats ayant postulé à une offre de son
    entreprise."""
    if skip < 0 or limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="Paramètres de pagination invalides.")

    if current_user.role == UserRole.SUPERADMIN:
        repo = UserRepository(db)
        users = await repo.get_candidates(skip=skip, limit=limit, search=search)
        return [_to_brief(u, u.profile) for u in users]

    company_id = tenant_company_id(current_user)
    repo = UserRepository(db)
    users = await repo.get_candidates_tenant(
        company_id=company_id, skip=skip, limit=limit, search=search
    )
    return [_to_brief(u, u.profile) for u in users]


async def _load_candidate_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Charge un candidat par son ID, sans filtrage multi-tenant."""
    repo = UserRepository(db)
    user = await repo.get(user_id)
    if not user or user.role != UserRole.CANDIDATE:
        return None
    return user


@router.get(
    "/{user_id}",
    response_model=UserBriefResponse,
    summary="Détail d'un candidat du vivier",
)
async def get_candidate(
    user_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Fiche candidat complète pour un recruteur (respecte la confidentialité).
    Seuls les candidats ayant postulé à une offre de l'entreprise du demandeur
    sont visibles (isolation multi-tenant).
    """
    if current_user.role == UserRole.SUPERADMIN:
        # superadmin : pas de filtrage multi-tenant
        candidate_user = await _load_candidate_by_id(db, user_id)
        if not candidate_user or candidate_user.role != UserRole.CANDIDATE:
            raise HTTPException(status_code=404, detail="Candidat introuvable.")
        profile = candidate_user.profile
        if not (profile.is_profile_public if profile else True):
            raise HTTPException(status_code=403, detail="Ce profil est privé.")
        return _to_brief(candidate_user, profile)

    await _candidate_visible_by_tenant(current_user, user_id, db)
    candidate_user = await _load_candidate_by_id(db, user_id)
    if not candidate_user:
        raise HTTPException(status_code=404, detail="Candidat introuvable.")
    profile = candidate_user.profile
    if not (profile.is_profile_public if profile else True):
        raise HTTPException(status_code=403, detail="Ce profil est privé.")
    return _to_brief(candidate_user, profile)


@router.patch("/{user_id}", response_model=UserResponse, summary="Modifier un utilisateur (Superadmin)")
async def update_user_by_admin(
    user_id: str,
    user_in: UserUpdate,
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    Permet à un Superadmin de modifier les données de base d'un utilisateur.
    """
    service = UserService(db)
    user = await service.update_user(
        user_id, user_in, modified_by=str(current_admin.id)
    )
    await db.commit()
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK, summary="Désactiver un utilisateur (Soft Delete)")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Désactive un utilisateur. 
    Restreint au propriétaire du compte ou à un Superadmin.
    """
    if str(current_user.id) != user_id and current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")
        
    service = UserService(db)
    result = await service.soft_delete_user(user_id)
    await db.commit()
    return result


router.include_router(profile_router)
