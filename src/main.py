from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Le modèle de données 
class Candidat(BaseModel):
    nom: str
    email: str
    ville: str

# Simulation d'une "bd" en mémoire
db_candidats = []

@app.post("/api/v1/candidats")
async def creer_candidat(candidat: Candidat):
    db_candidats.append(candidat)
    return {"success": True, "data": candidat}