"""Provisioning de l'entreprise à l'inscription recruteur."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.modules.auth.schemas import RegisterRequest
from src.modules.users.models import UserRole


class TestRecruiterCompanyProvisioning:
    @pytest.mark.asyncio
    async def test_register_recruiter_creates_company_and_links_user(self):
        """L'inscription recruteur crée une Company et renseigne user.company_id."""
        from src.modules.auth.services import AuthService

        company = MagicMock()
        company.id = "comp-123"
        user = MagicMock()
        user.id = "u-rec"
        user.email = "rh@acme.fr"

        with patch(
            "src.modules.companies.services.CompanyService"
        ) as company_cls:
            company_cls.return_value.create_company = AsyncMock(return_value=company)

            db = AsyncMock()
            service = AuthService(db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=user)

            token = await service.register(
                RegisterRequest(
                    email="rh@acme.fr",
                    password="secret123",
                    company_name="Acme SAS",
                ),
                role=UserRole.RECRUITER,
            )

        assert token.access_token
        created = service.user_repo.create.call_args.args[0]
        assert created["company_id"] == "comp-123"
        assert created["role"] == UserRole.RECRUITER
        company_cls.return_value.create_company.assert_awaited_once()
        company_payload = company_cls.return_value.create_company.call_args.args[0]
        assert company_payload.name == "Acme SAS"

    @pytest.mark.asyncio
    async def test_register_recruiter_without_company_name_uses_email_domain(self):
        """Sans company_name, le nom de l'entreprise est dérivé du domaine email."""
        from src.modules.auth.services import AuthService

        company = MagicMock()
        company.id = "comp-456"
        user = MagicMock()
        user.id = "u-rec-2"
        user.email = "rh@globex.io"

        with patch(
            "src.modules.companies.services.CompanyService"
        ) as company_cls:
            company_cls.return_value.create_company = AsyncMock(return_value=company)

            db = AsyncMock()
            service = AuthService(db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=user)

            await service.register(
                RegisterRequest(email="rh@globex.io", password="secret123"),
                role=UserRole.RECRUITER,
            )

        company_payload = company_cls.return_value.create_company.call_args.args[0]
        assert company_payload.name == "Globex"

    @pytest.mark.asyncio
    async def test_register_candidate_does_not_create_company(self):
        """Un candidat ne déclenche pas la création d'entreprise."""
        from src.modules.auth.services import AuthService

        user = MagicMock()
        user.id = "u-cand"
        user.email = "cand@example.com"

        with patch(
            "src.modules.companies.services.CompanyService"
        ) as company_cls:
            db = AsyncMock()
            service = AuthService(db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=user)

            await service.register(
                RegisterRequest(email="cand@example.com", password="secret123"),
                role=UserRole.CANDIDATE,
            )

        company_cls.assert_not_called()
        created = service.user_repo.create.call_args.args[0]
        assert created["company_id"] is None
