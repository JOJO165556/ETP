from pydantic import BaseModel, ConfigDict


class JobSearchFilters(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "query": "développeur python",
            "skills": ["python", "fastapi", "postgresql"],
            "status": "active",
            "is_remote": True,
            "page": 1,
            "page_size": 20,
        }
    })
    query: str | None = None
    skills: list[str] | None = None
    status: str | None = None
    is_remote: bool | None = None
    company_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    page: int = 1
    page_size: int = 20


class CandidateSearchFilters(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "query": "Jean",
            "skills": ["python", "react"],
            "page": 1,
            "page_size": 10,
        }
    })
    query: str | None = None
    skills: list[str] | None = None
    role: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    page: int = 1
    page_size: int = 20


class SearchResult(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "items": [{"id": "job-123", "title": "Dev Python"}],
            "total": 42,
            "page": 1,
            "page_size": 20,
            "total_pages": 3,
        }
    })
    items: list[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
