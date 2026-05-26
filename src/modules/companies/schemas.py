from pydantic import BaseModel, ConfigDict, Field

class CompanyBase(BaseModel):
    name: str = Field(..., description="Le nom officiel de l'entreprise")
    siret: str | None = Field(None, min_length=14, max_length=14, description="Le SIRET à 14 chiffres")

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: str | None = None
    siret: str | None = None
    is_active: bool | None = None
    settings: dict | None = None

class CompanyResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slug: str
    is_active: bool
    settings: dict | None = None
