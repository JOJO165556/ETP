FROM python:3.12-slim AS builder

# Dependances systeme pour pdfplumber (poppler) et psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation de Poetry
RUN pip install --no-cache-dir poetry==1.8.3

# Copie des fichiers de dependances en premier pour profiter du cache Docker
COPY pyproject.toml poetry.lock ./

# Installation des dependances sans creer d'environnement virtuel
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# --- Stage final ---
FROM python:3.12-slim

# Dependances runtime uniquement
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier les dependances depuis le builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Creer un utilisateur non-root
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copier le code source
COPY . .

# Propriete a l'utilisateur appuser
RUN chown -R appuser:appuser /app

# Passer a l'utilisateur non-root
USER appuser

# Port par defaut
EXPOSE 8000

# Commande par defaut — sans --reload en production
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
