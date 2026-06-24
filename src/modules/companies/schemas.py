from pydantic import BaseModel, ConfigDict, Field

class CompanyBase(BaseModel):
    name: str = Field(..., description="Le nom officiel de l'entreprise")
    siret: str | None = Field(None, min_length=14, max_length=14, description="Le SIRET à 14 chiffres")

class CompanyCreate(CompanyBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "TechCorp France", "siret": "12345678901234"}
    })

class CompanyUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "TechCorp SAS", "is_active": True}
    })
    name: str | None = None
    siret: str | None = None
    is_active: bool | None = None
    settings: dict | None = None

class CompanyResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "comp-123",
            "name": "TechCorp France",
            "siret": "12345678901234",
            "slug": "techcorp-france",
            "is_active": True,
            "settings": {},
        }
    })
    id: str
    slug: str
    is_active: bool
    settings: dict | None = None
