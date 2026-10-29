# ETP Platform - Frontend

Ce dépôt contient le code source de l'interface utilisateur de la plateforme ETP (Enterprise Talent Platform), une solution moderne et intelligente d'acquisition et de gestion des talents.

## Architecture & Technologies

Le projet est construit avec une architecture modulaire et des standards d'ingénierie stricts, garantissant maintenabilité, performance et évolutivité.

### Stack Technique Principale
- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Style** : TailwindCSS
- **Composants UI** : shadcn/ui (personnalisé), Radix UI
- **Icônes** : Lucide React
- **Code Quality** : ESLint, Prettier

## Structure du Projet

```text
frontend/
├── src/
│   ├── app/                    # Configuration du routage Next.js (App Router)
│   │   ├── (admin)/            # Pages spécifiques à l'administration système et configuration
│   │   ├── (auth)/             # Pages d'authentification (login, register)
│   │   ├── (dashboard)/        # Tableau de bord principal (analytiques, vivier, offres)
│   │   ├── (onboarding)/       # Flux d'intégration et parsing de CV
│   │   └── api/                # Routes API internes (ex: set-cookie)
│   ├── components/             # Composants React réutilisables
│   │   ├── shared/             # Composants métiers (JobCard, StatusBadge, etc.)
│   │   └── ui/                 # Composants d'interface génériques (ProgressBar, ToggleSwitch, etc.)
│   ├── lib/                    # Utilitaires globaux (cn, formatters)
│   ├── services/               # Couche d'accès aux données et appels API externes
│   └── types/                  # Définitions des types TypeScript globaux (domain.ts)
```

## Standards de Code & Lignes Directrices

Ce projet respecte des règles d'ingénierie et de design strictes pour une qualité de niveau production :

1. **Design System & UX**
   - Utilisation de tokens de design consistants (pas de couleurs génériques ou de styles inline arbitraires).
   - Priorité à la lisibilité, au contraste (WCAG) et à une navigation intuitive.
   - Les fioritures visuelles inutiles (emojis décoratifs, séparateurs artificiels) sont proscrites au profit d'une interface professionnelle et épurée.

2. **Typage Strict**
   - Le code doit être fortement typé avec TypeScript. L'utilisation de `any` est à éviter.
   - Les modèles de données métiers sont centralisés dans `src/types/domain.ts`.

3. **Architecture des Composants**
   - Séparation stricte entre les composants de présentation (UI) et la logique métier.
   - Les appels API et la gestion des données doivent être délégués au dossier `src/services/`.
   - L'approche "Server Components" de Next.js est privilégiée, et l'utilisation de `"use client"` est limitée aux composants nécessitant de l'interactivité ou de la gestion d'état.

4. **Formatage & Documentation**
   - Le code est formaté automatiquement via Prettier.
   - Les commentaires doivent être clairs, professionnels, rédigés en français, et se concentrer sur le "pourquoi" de la logique métier plutôt que sur le "quoi" du code trivial.

## Installation & Démarrage

### Prérequis
- Node.js (version LTS recommandée)
- npm ou yarn

### Commandes

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement
npm run dev

# Vérification du typage
npm run typecheck

# Formatage du code
npm run format

# Build pour la production
npm run build
```

L'application sera accessible par défaut sur `http://localhost:3000`.

## Déploiement

Le projet est configuré pour être déployé aisément sur des plateformes modernes telles que Vercel ou via des environnements conteneurisés (Docker). Assurez-vous de définir les variables d'environnement nécessaires lors de la mise en production.
