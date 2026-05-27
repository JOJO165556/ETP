FROM python:3.12-slim

# Dépendances système nécessaires pour pdfplumber (poppler) et psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation de Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copie des fichiers de dépendances en premier pour profiter du cache Docker
COPY pyproject.toml poetry.lock ./

# Installation des dépendances sans créer d'environnement virtuel (on est déjà dans le container)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Copie du code source
COPY . .

# Port par défaut exposé pour l'API FastAPI (uvicorn)
EXPOSE 8000

# Commande par défaut — surchargée dans docker-compose pour les workers Celery
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
