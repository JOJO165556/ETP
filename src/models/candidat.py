from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
import uuid
from src.database import Base

class Candidat(Base):
    __tablename__ = "candidats"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    localisation = Column(Geometry(geometry_type='POINT', srid=4326))
    applications = relationship("Application", back_populates="candidat")