from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.storage import AsyncStorageService
from src.modules.auth.dependencies import get_current_user, require_roles
from src.modules.users.models import User, UserRole
from src.modules.users.repository import UserProfileRepository, UserRepository
from src.modules.users.schemas import ProfileResponse, UserResponse, UserCreate, UserAdminCreate, UserUpdate, UserMeUpdate
from src.modules.users.services import UserService

profile_router = APIRouter(prefix="/profile")

_SUPERADMIN = require_roles(UserRole.SUPERADMIN)
_CANDIDATE_OR_ADMIN = require_roles(UserRole.CANDIDATE, UserRole.SUPERADMIN)
_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)

MAX_CV_SIZE_BYTES = 5 * 1024 * 1024  # 5 Mo


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

    updated_profile = await profile_repo.update_cv_key(
        user_id=str(current_user.id),
        cv_key=file_key,
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
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Génère une URL signée temporaire (1 heure) pour accéder au CV d'un candidat

    Accès : RECRUITER, COMPANY_ADMIN, SUPERADMIN uniquement.
    Un candidat ne peut pas consulter le CV d'un autre candidat via cet endpoint.
    """
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
    user = await service.update_me(str(current_user.id), data_in)
    await db.commit()
    return user


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
    user = await service.update_user(user_id, user_in)
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
