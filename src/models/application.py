import uuid
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import String
from src.database import Base

class Application(Base):
    __tablename__ = "applications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidat_id = Column(UUID(as_uuid=True), ForeignKey("candidats.id"))
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"))
    statut = Column(String, default="nouveau") # ATS Pipeline 
    
    candidat = relationship("Candidat", back_populates="applications")
    job = relationship("Job", back_populates="applications")