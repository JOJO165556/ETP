# Enterprise Talent Platform (ETP)

Plateforme de gestion des talents d'entreprise avec matching IA, gestion documentaire et conformite RGPD.

## Architecture

```
src/
├── core/           # Config, DB, security, Celery, storage
├── modules/
│   ├── auth/       # JWT, refresh tokens, roles
│   ├── users/      # Profils, CV, geolocalisation
│   ├── companies/  # Entreprises
│   ├── jobs/       # Offres d'emploi, matching geospatial
│   ├── applications/ # Pipeline candidatures, extraction IA
│   ├── analytics/  # Dashboard, funnel, stats
│   ├── gdpr/       # Export, suppression, anonymisation
│   ├── notifications/ # Email + in-app
│   └── search/     # Recherche avancee multi-criteres
tests/              # Tests unitaires et integration
```

## Infrastructure

- **PostgreSQL 15 + PostGIS** : base de donnees geospatiale
- **Redis** : cache, Celery broker, rate limiting
- **MinIO** : stockage S3-compatible (CV, documents)
- **Celery** : taches asynchrones (parsing CV, matching)
- **Flower** : monitoring des taches Celery

## Demarrage rapide

```bash
# 1. Copier et configurer les variables d'environnement
cp .env.example .env
# Editer .env avec vos valeurs

# 2. Lancer l'infrastructure
docker compose up -d

# 3. Installer les dependances
pip install -e ".[ai]"  # avec IA locale
pip install -e .         # sans IA

# 4. Appliquer les migrations
alembic upgrade head

# 5. Lancer l'API
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 6. Lancer le worker Celery
celery -A src.core.celery_app.celery_app worker --loglevel=info
```

## API

Documentation Swagger : `http://localhost:8000/docs`

### Endpoints principaux

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `POST /auth/login` | Connexion (JWT) |
| Auth | `POST /auth/register` | Inscription |
| Auth | `POST /auth/refresh` | Rafraichir les tokens |
| Jobs | `POST /jobs/` | Creer une offre |
| Jobs | `POST /search/jobs` | Recherche avancee |
| Applications | `POST /applications/jobs/{id}/apply` | Postuler |
| Analytics | `GET /analytics/dashboard` | Tableau de bord |
| GDPR | `GET /gdpr/export/{user_id}` | Export donnees |
| Notifications | `POST /notifications/` | Creer une notification |

### Roles

- `superadmin` : acces total
- `company_admin` : admin entreprise
- `recruiter` : recruteur
- `candidate` : candidat

## Tests

```bash
python -m pytest src/ tests/ -v
```

## Variables d'environnement

Voir `.env.example` pour la liste complete.
