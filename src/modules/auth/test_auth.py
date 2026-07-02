import pytest
from src.modules.auth.schemas import Token, TokenData, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest


class TestAuthSchemas:
    """Tests pour les schémas d'authentification."""

    def test_token(self):
        token = Token(access_token="abc", refresh_token="def", token_type="bearer")
        assert token.access_token == "abc"
        assert token.refresh_token == "def"
        assert token.token_type == "bearer"

    def test_token_data(self):
        td = TokenData(user_id="u1", token_type="refresh")
        assert td.user_id == "u1"
        assert td.token_type == "refresh"

    def test_register_request(self):
        req = RegisterRequest(email="a@b.com", password="secret", first_name="Jo")
        assert req.email == "a@b.com"
        assert req.first_name == "Jo"

    def test_refresh_token_request(self):
        req = RefreshTokenRequest(refresh_token="xyz")
        assert req.refresh_token == "xyz"

    def test_change_password_request(self):
        req = ChangePasswordRequest(current_password="old", new_password="new")
        assert req.current_password == "old"
        assert req.new_password == "new"


class TestSecurityFunctions:
    """Tests pour les fonctions de sécurité."""

    def test_password_hash_and_verify(self):
        from src.core.security import get_password_hash, verify_password
        password = "mon_secret_123"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed)
        assert not verify_password("wrong", hashed)

    def test_create_tokens(self):
        from src.core.security import create_access_token, create_refresh_token
        from jose import jwt
        from src.core.config import settings
        from src.core.security import ALGORITHM, REFRESH_SECRET_KEY

        access = create_access_token("user123")
        refresh = create_refresh_token("user123")

        access_payload = jwt.decode(access, settings.SECRET_KEY, algorithms=[ALGORITHM])
        refresh_payload = jwt.decode(refresh, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])

        assert access_payload["sub"] == "user123"
        assert access_payload["type"] == "access"
        assert refresh_payload["sub"] == "user123"
        assert refresh_payload["type"] == "refresh"


class TestNotificationSchemas:
    """Tests pour les schémas de notifications."""

    def test_email_template_render(self):
        from src.modules.notifications.services import render_email
        subject, body = render_email("application_received", {
            "job_title": "Dev Python",
            "company_name": "TechCorp",
        })
        assert "Dev Python" in subject
        assert "TechCorp" in body

    def test_invalid_template(self):
        from src.modules.notifications.services import render_email
        with pytest.raises(ValueError):
            render_email("template_inexistant", {})


class TestSearchSchemas:
    """Tests pour les schémas de recherche."""

    def test_job_search_filters(self):
        from src.modules.search.schemas import JobSearchFilters
        filters = JobSearchFilters(query="python", skills=["python", "fastapi"], page=2)
        assert filters.query == "python"
        assert filters.page == 2

    def test_search_result(self):
        from src.modules.search.schemas import SearchResult
        result = SearchResult(items=[], total=0, page=1, page_size=20, total_pages=0)
        assert result.total_pages == 0


class TestRateLimiter:
    """Tests pour le rate limiter."""

    def test_rate_limiter_init(self):
        from src.core.rate_limit import RateLimiter
        limiter = RateLimiter()
        assert limiter._redis is None
