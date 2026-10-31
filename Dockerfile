FROM python:3.12-slim-bookworm AS builder

# Variables d'environnement build
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

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

# Copie des manifestes en premier — profite du cache Docker si inchanges
COPY pyproject.toml poetry.lock ./

# Installation des dependances de production uniquement (pas de dev/test)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root --only main

# Stage runtime
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependances runtime uniquement
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    poppler-utils \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Creer l'utilisateur non-root avant la copie (evite un chown recursif couteux)
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Copier les dépendances depuis le builder (avec propriete directe)
COPY --from=builder --chown=appuser:appuser /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder --chown=appuser:appuser /usr/local/bin /usr/local/bin

# Copier le code source (propriete directe, pas de chown post-copy)
COPY --chown=appuser:appuser . .

# Passer a l'utilisateur non-root
USER appuser

# Port par defaut
EXPOSE 8000

# Healthcheck natif Docker (utilise par Render et docker-compose)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health/ready || exit 1

# Commande par defaut — sans --reload, 2 workers en production
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
