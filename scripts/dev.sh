#!/bin/bash
# Script de démarrage rapide pour le développement local.
# Lance uniquement les infras via Docker, puis uvicorn directement.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> Démarrage des services d'infrastructure (DB, Redis, MinIO)..."
docker compose up -d db redis minio

echo "==> Attente que PostgreSQL soit prêt..."
until docker compose exec db pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-etp_db}" > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL : OK"

echo "==> Application des migrations Alembic..."
# On charge le .env mais on force les hôtes à localhost (hors Docker)
set -a && source .env && set +a
export POSTGRES_SERVER=127.0.0.1
export MINIO_ENDPOINT=127.0.0.1:9000
export REDIS_URL="redis://:${REDIS_PASSWORD:-etp_redis_secret}@127.0.0.1:6379/0"
.venv/bin/alembic upgrade head

echo "==> Démarrage de l'API FastAPI (port 8000)..."
.venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
