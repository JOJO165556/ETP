from pydantic import BaseModel


class JobSearchFilters(BaseModel):
    query: str | None = None
    skills: list[str] | None = None
    status: str | None = None
    is_remote: bool | None = None
    company_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None  # rayon de recherche en km
    page: int = 1
    page_size: int = 20


class CandidateSearchFilters(BaseModel):
    query: str | None = None
    skills: list[str] | None = None
    role: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    page: int = 1
    page_size: int = 20


class SearchResult(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
