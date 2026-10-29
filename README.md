# Enterprise Talent Platform (ETP)

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12+" />
  <img src="https://img.shields.io/badge/FastAPI-0.136-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-15.3-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL / PostGIS" />
  <img src="https://img.shields.io/badge/Celery-5.4-37814A?style=for-the-badge&logo=celery&logoColor=white" alt="Celery" />
  <img src="https://img.shields.io/badge/Redis-Cache%20%26%20Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/MinIO-S3%20Storage-C72C48?style=for-the-badge&logo=minio&logoColor=white" alt="MinIO" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI%20Matching-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License: MIT" />
</p>

**Enterprise Talent Platform (ETP)** est une solution ATS (*Applicant Tracking System*) d'entreprise moderne, multi-tenant et pilotée par l'intelligence artificielle, couvrant l'ensemble du cycle de recrutement, de la publication des offres au suivi des candidats :

- **Multi-Tenancy strict & Sécurité** : Cloisonnement étanche par entreprise (données, offres, candidatures), contrôle d'accès basé sur les rôles (RBAC : `superadmin`, `company_admin`, `recruiter`, `candidate`) et authentification sécurisée (JWT / Firebase Auth).
- **Parsing CV & Matching IA Hybride** : Extraction automatisée de texte depuis les CV PDF (`pdfplumber`), structuration en JSON et moteur de matching intelligent multi-fournisseurs (Google Gemini 2.5 & Hugging Face) avec basculement automatique (*fallback*).
- **Recherche Avancée & Géolocalisation** : Moteur de recherche multicritère combinant recherche plein texte PostgreSQL (*Full-Text Search*) et indexation spatiale PostGIS pour le ciblage kilométrique des opportunités.
- **Pipeline de Recrutement ATS & Entretiens** : Gestion d'étapes de candidatures, évaluation et notes recruteur, planification des entretiens avec prise en compte des contraintes de calendrier.
- **Notifications Multicanales** : Alertes in-app temps réel et courriels transactionnels SMTP avec rendu de templates responsives (Jinja2).
- **Conformité RGPD & Observabilité** : Portabilité des données (export complet), droit à l'oubli (anonymisation irréversible), instrumentation Prometheus et monitoring Celery Flower.

---

## 1. Architecture

```
etp_platform/
├── src/                          # Backend FastAPI
│   ├── core/                     # Base de donnees, config, securite, stockage S3, emails
│   ├── models/                   # Mixins transverses (UUID, Audit, SoftDelete)
│   ├── templates/                # Templates d'emails Jinja2
│   └── modules/
│       ├── auth/                 # JWT, RBAC, Firebase, OAuth
│       ├── users/                # Profils, competences, geolocalisation
│       ├── companies/            # Multi-tenancy entreprises
│       ├── jobs/                 # Offres, recherche textuelle et spatiale
│       ├── applications/         # Pipeline candidatures, parsing CV, notes recruteur
│       ├── interviews/           # Entretiens et contraintes d'agenda
│       ├── ai/                   # Orchestrateur et fournisseurs IA (Gemini / HuggingFace)
│       ├── analytics/            # Vue materialisee des KPIs et agregations
│       ├── notifications/        # Emails SMTP et notifications en base
│       ├── search/               # Moteur de recherche FTS et geospatial
│       └── gdpr/                 # Export et anonymisation RGPD
├── frontend/                     # Interface Web Next.js 15 (React 19, TypeScript, Tailwind)
├── alembic/                      # Migrations de base de donnees
├── docker-compose.yml            # Services conteneurises (PostgreSQL, Redis, MinIO)
└── tests/                        # Tests automatises pytest
```

---

## 2. Démarrage Rapide

#### 1. Démarrer les services d'infrastructure

```bash
docker compose up -d db redis minio
```

#### 2. Lancer l'API Backend (Terminal 1)

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Lancer le Worker Celery (Terminal 2)

```bash
source .venv/bin/activate
celery -A src.core.celery_app.celery_app worker --loglevel=info
```

#### 4. Lancer le Frontend Next.js (Terminal 3)

```bash
cd frontend
npm install
npm run dev
```

---

### Mode Conteneurisé (Docker Compose)

Pour lancer l'ensemble des conteneurs backend et d'observabilité en une commande :

```bash
docker compose --profile monitoring up -d --build
```

---

## 3. Commandes de Validation et Tests

```bash
# Tests Backend
.venv/bin/pytest tests/ -v

# Linter Backend
.venv/bin/ruff check src/ tests/

# Verification des types Frontend
npm --prefix frontend run type-check

# Linter Frontend
npm --prefix frontend run lint

# Build de production Frontend
npm --prefix frontend run build
```

---

## 4. Licence

Distribué sous la licence MIT. Consultez le fichier [`LICENSE`](LICENSE) pour plus de détails.

