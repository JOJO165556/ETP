"""
Script de seed de démonstration - données fictives Togo / Afrique de l'Ouest.
Usage :
    python scripts/seed_demo.py

Variables d'environnement requises : DATABASE_URL (connexion PostgreSQL).
Le script est idempotent : il vérifie avant d'insérer.
"""
import asyncio
import os
import sys
import uuid
from pathlib import Path
from typing import Any

# Racine du projet
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from src.core.config import _normalize_postgres_url, settings
from src.core.security import get_password_hash
from src.modules.companies.models import Company
from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import User, UserRole

COMPANIES: list[dict[str, Any]] = [
    {
        "name": "EcoTech Lomé",
        "slug": "ecotech-lome",
        "siret": None,
    },
    {
        "name": "AfriPay Solutions",
        "slug": "afripay-solutions",
        "siret": None,
    },
    {
        "name": "SantéPlus Abidjan",
        "slug": "santeplus-abidjan",
        "siret": None,
    },
    {
        "name": "Sahel Logistique",
        "slug": "sahel-logistique",
        "siret": None,
    },
    {
        "name": "Dakar Code Academy",
        "slug": "dakar-code-academy",
        "siret": None,
    },
]

JOBS_DATA: list[dict[str, Any]] = [
    {
        "company_slug": "ecotech-lome",
        "title": "Ingénieur Agronome / Tech Agricole",
        "description": (
            "EcoTech Lomé développe des capteurs IoT solaires pour optimiser l'irrigation des cultures maraîchères au Togo. "
            "Nous recrutons un ingénieur agronome pour accompagner nos coopératives partenaires dans la Région Maritime "
            "et intégrer nos solutions numériques sur le terrain.\n\n"
            "Missions et responsabilités :\n"
            "• Déployer et calibrer les capteurs IoT d'humidité du sol et de météo locale sur les parcelles pilotes\n"
            "• Former les agriculteurs et coopératives à l'utilisation des tableaux de bord d'irrigation\n"
            "• Réaliser des diagnostics agronomiques et recommander des itinéraires techniques adaptés\n"
            "• Collecter et analyser les données de rendement via SIG (QGIS ou ArcGIS)\n"
            "• Rédiger des rapports de suivi pour les bailleurs (PNUD, AFD, GIZ)\n"
            "• Coordonner avec l'équipe technique pour améliorer les algorithmes d'optimisation\n\n"
            "Profil recherché :\n"
            "• Diplôme d'ingénieur agronome (Bac+5) ou master en agriculture tropicale\n"
            "• 2 ans minimum d'expérience terrain en Afrique subsaharienne\n"
            "• Maîtrise d'un logiciel SIG (QGIS, ArcGIS) et de Excel avancé\n"
            "• Notions en IoT ou capteurs connectés (un atout)\n"
            "• Bonne capacité de communication avec des communautés rurales\n"
            "• Permis B obligatoire ; disponibilité pour des déplacements réguliers\n\n"
            "Avantages du poste :\n"
            "• Salaire compétitif + indemnités de déplacement\n"
            "• Véhicule de service fourni pour les missions terrain\n"
            "• Formation continue sur les technologies AgriTech\n"
            "• Projet à fort impact social dans une startup en pleine croissance\n"
            "• Équipe pluridisciplinaire (agronomes, développeurs, data scientists)"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Boulevard du 13 Janvier, Lomé, Togo",
        "lon": 1.2226,
        "lat": 6.1319,
        "required_skills": ["Agronomie", "IoT", "SIG", "Gestion de projet"],
    },
    {
        "company_slug": "ecotech-lome",
        "title": "Responsable Développement Commercial",
        "description": (
            "EcoTech Lomé cherche un Responsable Commercial pour accélérer son déploiement auprès des ONG, "
            "bailleurs de fonds et coopératives agricoles au Togo, Bénin et Ghana. "
            "Vous serez le premier point de contact de nos partenaires stratégiques en Afrique de l'Ouest.\n\n"
            "Missions et responsabilités :\n"
            "• Identifier et prospecter de nouveaux partenaires institutionnels (ONG, coopératives, agences gouvernementales)\n"
            "• Négocier et conclure des contrats de déploiement de capteurs et services IoT\n"
            "• Élaborer des propositions commerciales et répondre aux appels d'offres\n"
            "• Assurer le suivi des comptes clients et la fidélisation post-vente\n"
            "• Représenter EcoTech lors de salons agricoles et événements sectoriels régionaux\n"
            "• Produire des reportings hebdomadaires sur le pipeline commercial\n\n"
            "Profil recherché :\n"
            "• Formation Bac+4/5 en commerce, marketing ou développement international\n"
            "• 3 ans minimum en développement commercial B2B, idéalement dans l'AgriTech ou l'humanitaire\n"
            "• Excellentes compétences en négociation et communication interculturelle\n"
            "• Maîtrise du français et de l'anglais professionnel (l'anglais est indispensable pour le Ghana)\n"
            "• Permis B obligatoire ; disponibilité pour des déplacements fréquents (Togo, Bénin, Ghana)\n"
            "• À l'aise avec les outils CRM (HubSpot, Salesforce ou équivalent)\n\n"
            "Avantages du poste :\n"
            "• Rémunération fixe + commissions sur objectifs dépassés\n"
            "• Véhicule de fonction et prise en charge des frais de déplacement\n"
            "• Carte SIM multi-opérateurs pour les déplacements régionaux\n"
            "• Autonomie et responsabilités élevées dès l'intégration\n"
            "• Opportunité d'évoluer vers un poste de Directeur Commercial Afrique"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Quartier Adidogomé, Lomé, Togo",
        "lon": 1.1680,
        "lat": 6.1720,
        "required_skills": ["Vente B2B", "Négociation", "Anglais professionnel", "Reporting"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Lead Développeur Python / FastAPI",
        "description": (
            "AfriPay Solutions conçoit des passerelles de paiement interconnectées aux principaux opérateurs "
            "Mobile Money d'Afrique de l'Ouest (Flooz, T-Money, Orange Money, MTN MoMo). "
            "Nous recrutons un Lead Developer Python senior pour concevoir et opérer nos APIs financières "
            "à haute disponibilité, traitant plusieurs millions de transactions par mois.\n\n"
            "Missions et responsabilités :\n"
            "• Concevoir l'architecture technique des microservices de paiement (FastAPI, Redis, PostgreSQL)\n"
            "• Développer et maintenir les intégrations avec les APIs des opérateurs Mobile Money\n"
            "• Mettre en place des mécanismes de retry, idempotence et tolérance aux pannes réseau\n"
            "• Encadrer une équipe de 3 à 5 développeurs backend juniors et médiors\n"
            "• Définir les standards de code, conduire les revues de code et les sessions de mentoring\n"
            "• Piloter le déploiement continu via Docker, GitHub Actions et Kubernetes\n"
            "• Garantir un taux de disponibilité ≥ 99,9 % des APIs de paiement\n\n"
            "Profil recherché :\n"
            "• Bac+5 en informatique ou équivalent ; 5 ans minimum d'expérience backend Python\n"
            "• Maîtrise experte de FastAPI, SQLAlchemy async, Pydantic v2\n"
            "• Expérience confirmée avec PostgreSQL (indexation, optimisation, migrations Alembic)\n"
            "• Bonne connaissance de Redis (cache, pub/sub, rate limiting)\n"
            "• Pratique de Docker, docker-compose et déploiement cloud (GCP, AWS ou Azure)\n"
            "• Expérience en environnement fintech ou paiements électroniques (un atout majeur)\n"
            "• Capacité à travailler en autonomie dans un contexte de full remote\n\n"
            "Avantages du poste :\n"
            "• Salaire attractif négocié selon expérience (en FCFA ou EUR selon localisation)\n"
            "• 100 % télétravail avec équipement home-office fourni\n"
            "• Stock-options sur la prochaine levée de fonds Série A\n"
            "• Budget formation annuel de 500 000 FCFA (conférences, certifications)\n"
            "• Couverture santé complémentaire pour le titulaire et sa famille"
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Lomé, Togo",
        "lon": 1.2167,
        "lat": 6.1375,
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Mobile Money"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Spécialiste Conformité & Anti-Fraude",
        "description": (
            "AfriPay Solutions renforce son équipe Conformité pour accompagner sa croissance régionale "
            "et répondre aux exigences de la BCEAO en matière de lutte contre le blanchiment d'argent "
            "et le financement du terrorisme (AML/CFT). Poste basé à Accra, déplacements réguliers à Lomé.\n\n"
            "Missions et responsabilités :\n"
            "• Surveiller en temps réel les transactions Mobile Money suspectes via les outils de détection de fraude\n"
            "• Rédiger et soumettre les déclarations de soupçon (SAR) aux autorités compétentes\n"
            "• Mettre à jour et appliquer les procédures KYC/KYB pour l'onboarding des marchands\n"
            "• Réaliser des audits de conformité trimestriels et produire des rapports pour la direction\n"
            "• Former les équipes opérationnelles aux risques de fraude et aux obligations réglementaires\n"
            "• Assurer une veille permanente sur l'évolution des directives BCEAO, GIABA et FATF\n\n"
            "Profil recherché :\n"
            "• Bac+5 en droit, finance, comptabilité ou gestion des risques\n"
            "• 3 ans minimum en conformité, audit ou gestion du risque dans le secteur financier\n"
            "• Connaissance approfondie des réglementations AML/CFT et du cadre BCEAO\n"
            "• Certification CAMS (Certified Anti-Money Laundering Specialist) appréciée\n"
            "• Maîtrise des outils de détection de fraude (Featurespace, FICO Falcon ou équivalent)\n"
            "• Rigueur, intégrité et capacité à travailler sous pression\n\n"
            "Avantages du poste :\n"
            "• Rémunération en GHS + prime de performance semestrielle\n"
            "• Prise en charge des certifications professionnelles (CAMS, ICA)\n"
            "• Couverture santé complète (titulaire + 2 ayants droit)\n"
            "• Environnement multiculturel avec exposition aux marchés Togo, Ghana, Côte d'Ivoire\n"
            "• Plan de carrière vers un poste de Directeur Conformité Afrique de l'Ouest"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Airport Road, Accra, Ghana",
        "lon": -0.1740,
        "lat": 5.6050,
        "required_skills": ["Conformité", "Anti-Fraude", "AML/CFT", "Réglementation BCEAO"],
    },
    {
        "company_slug": "santeplus-abidjan",
        "title": "Infirmier diplômé d'État",
        "description": (
            "SantéPlus Abidjan est un réseau de 12 centres de santé de proximité couvrant les quartiers "
            "populaires d'Abidjan (Cocody, Yopougon, Abobo, Adjamé). "
            "Nous recrutons des infirmiers diplômés d'État pour renforcer nos équipes soignantes "
            "et assurer la continuité des soins 24h/24.\n\n"
            "Missions et responsabilités :\n"
            "• Réaliser les soins infirmiers prescrits (injections, pansements, perfusions, prélèvements)\n"
            "• Accueillir et trier les patients aux urgences selon le protocole de triage\n"
            "• Surveiller l'état clinique des patients hospitalisés et alerter le médecin si nécessaire\n"
            "• Tenir à jour les dossiers patients dans le logiciel de gestion médicale (OpenMRS)\n"
            "• Éduquer les patients et leurs familles sur les traitements et l'hygiène de vie\n"
            "• Participer aux campagnes de vaccination et de dépistage communautaire\n\n"
            "Profil recherché :\n"
            "• Diplôme d'État d'Infirmier (DEI) délivré par un établissement reconnu\n"
            "• Autorisation d'exercer en Côte d'Ivoire (Ordre des Infirmiers)\n"
            "• 1 an minimum d'expérience clinique (urgences, médecine générale ou maternité)\n"
            "• Maîtrise des soins d'urgence et des gestes de premiers secours (BLS/ACLS)\n"
            "• Bonne maîtrise des outils informatiques pour la gestion des dossiers\n"
            "• Disponibilité pour les gardes de nuit par roulement (planning mensuel)\n\n"
            "Avantages du poste :\n"
            "• Salaire fixe conforme à la grille SMIG + prime de nuit et de garde\n"
            "• Mutuelle santé d'entreprise couvrant les soins dans le réseau SantéPlus\n"
            "• Formation continue financée (protocoles urgences, gestion des épidémies)\n"
            "• Tenue professionnelle et équipements de protection individuelle fournis\n"
            "• Évolution vers des postes d'infirmier chef de service sous 3 ans"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Cocody Angré, Abidjan, Côte d'Ivoire",
        "lon": -3.9870,
        "lat": 5.3890,
        "required_skills": ["Soins infirmiers", "Urgences", "Gestion des dossiers patients"],
    },
    {
        "company_slug": "santeplus-abidjan",
        "title": "Data Analyst Santé Publique",
        "description": (
            "SantéPlus Abidjan structure son pôle Data pour piloter ses décisions cliniques et "
            "améliorer la prévention dans ses 12 centres. Nous cherchons un Data Analyst "
            "spécialisé en santé publique pour transformer nos données épidémiologiques "
            "en recommandations actionnables.\n\n"
            "Missions et responsabilités :\n"
            "• Collecter, nettoyer et structurer les données de santé issues d'OpenMRS et de nos enquêtes terrain\n"
            "• Construire et maintenir des tableaux de bord Power BI de suivi épidémiologique\n"
            "• Analyser les parcours de soins et identifier les points de rupture dans le suivi patient\n"
            "• Modéliser les tendances de maladies chroniques (diabète, hypertension, paludisme) par quartier\n"
            "• Rédiger des rapports synthétiques pour la direction médicale et les bailleurs (OMS, UNICEF)\n"
            "• Contribuer aux protocoles de collecte de données pour les futures études cliniques\n\n"
            "Profil recherché :\n"
            "• Master en biostatistiques, épidémiologie, santé publique ou data science\n"
            "• 2 ans minimum d'expérience en analyse de données de santé\n"
            "• Maîtrise de Python (pandas, matplotlib, scikit-learn) et/ou R\n"
            "• Bonne connaissance de SQL et des bases de données relationnelles\n"
            "• Expérience avec Power BI ou Tableau pour la visualisation de données\n"
            "• Sensibilité aux enjeux de confidentialité des données médicales (RGPD / législation ivoirienne)\n\n"
            "Avantages du poste :\n"
            "• Poste 100 % télétravail avec réunions hebdomadaires en visio\n"
            "• Salaire attractif + prime de résultats sur indicateurs de santé\n"
            "• Accès à des datasets de santé publique uniques en Afrique de l'Ouest\n"
            "• Budget conférences scientifiques (ASTMH, AFENET) pris en charge\n"
            "• Missions terrain occasionnelles à Abidjan, frais remboursés"
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Plateau, Abidjan, Côte d'Ivoire",
        "lon": -4.0197,
        "lat": 5.3250,
        "required_skills": ["Python", "R", "Power BI", "SQL", "Santé publique"],
    },
    {
        "company_slug": "dakar-code-academy",
        "title": "Formateur en Programmation (Python / Scratch)",
        "description": (
            "Dakar Code Academy est la première école du numérique au Sénégal à proposer "
            "des bootcamps intensifs accessibles aux lycéens, étudiants et professionnels en reconversion. "
            "Nous recrutons un formateur passionné pour animer nos cursus Python, développement web et Intelligence Artificielle.\n\n"
            "Missions et responsabilités :\n"
            "• Concevoir et animer des sessions de formation Python (débutant à intermédiaire) et Scratch (jeunesse)\n"
            "• Préparer les supports pédagogiques, exercices pratiques et projets fil rouge\n"
            "• Encadrer les apprenants pendant les hackathons et projets de fin de bootcamp\n"
            "• Évaluer les compétences acquises et produire des bilans de progression\n"
            "• Contribuer à l'amélioration continue du curriculum en fonction des retours apprenants\n"
            "• Participer aux événements de la communauté tech dakaroise (meetups, Demo Day)\n\n"
            "Profil recherché :\n"
            "• Bac+3 minimum en informatique, mathématiques ou équivalent\n"
            "• 2 ans minimum d'expérience en développement Python (projets pro ou open source)\n"
            "• Expérience en enseignement, formation ou mentorat fortement souhaitée\n"
            "• Pédagogie naturelle, patience et capacité à vulgariser des concepts techniques\n"
            "• Maîtrise de Git/GitHub pour la gestion du code source des apprenants\n"
            "• Notions en JavaScript / HTML / CSS pour les modules développement web\n\n"
            "Avantages du poste :\n"
            "• Salaire fixe + rémunération variable selon le nombre de sessions animées\n"
            "• Accès gratuit à toutes les formations de l'académie pour votre développement personnel\n"
            "• Salle équipée (vidéoprojecteur, WiFi haut débit, postes de travail)\n"
            "• Réseau alumni actif et collaborations avec les entreprises tech de Dakar\n"
            "• Flexibilité des horaires selon le calendrier des bootcamps"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Mermoz, Dakar, Sénégal",
        "lon": -17.4720,
        "lat": 14.7110,
        "required_skills": ["Pédagogie", "Python", "JavaScript", "Git", "Mentorat"],
    },
    {
        "company_slug": "dakar-code-academy",
        "title": "Développeur Mobile React Native",
        "description": (
            "Dakar Code Academy lance son application mobile d'apprentissage en ligne, "
            "conçue pour fonctionner dans les zones à faible connectivité grâce à une architecture offline-first. "
            "Vous rejoindrez l'équipe produit pour concevoir une expérience d'apprentissage mobile fluide et inclusive.\n\n"
            "Missions et responsabilités :\n"
            "• Développer les écrans et fonctionnalités de l'application React Native (iOS & Android)\n"
            "• Implémenter la synchronisation des contenus de cours en mode offline (SQLite, WatermelonDB)\n"
            "• Intégrer les APIs backend (REST, GraphQL) pour la gestion des profils et progressions\n"
            "• Optimiser les performances de l'application pour des appareils d'entrée de gamme\n"
            "• Rédiger des tests unitaires et d'intégration (Jest, Detox)\n"
            "• Collaborer avec le designer UX/UI pour respecter les maquettes Figma\n\n"
            "Profil recherché :\n"
            "• Bac+4/5 en informatique ou autodidacte avec portfolio solide\n"
            "• 3 ans minimum d'expérience en développement React Native en production\n"
            "• Maîtrise de TypeScript et des hooks React (useReducer, useContext, custom hooks)\n"
            "• Expérience avec les stratégies offline-first (Realm, WatermelonDB, AsyncStorage)\n"
            "• Bonne connaissance des APIs natives (Push Notifications, Camera, Permissions)\n"
            "• Familiarité avec les pipelines de déploiement (Expo EAS Build, Fastlane)\n\n"
            "Avantages du poste :\n"
            "• 100 % télétravail depuis n'importe où en Afrique de l'Ouest\n"
            "• MacBook Pro fourni pour le développement iOS\n"
            "• Salaire en USD indexé sur les standards internationaux\n"
            "• Accès à toutes les formations de l'académie pour monter en compétences\n"
            "• Équipe internationale bienveillante avec rituels agiles hebdomadaires"
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Plateau, Dakar, Sénégal",
        "lon": -17.4380,
        "lat": 14.6720,
        "required_skills": ["React Native", "TypeScript", "Offline-first", "REST APIs"],
    },
    {
        "company_slug": "sahel-logistique",
        "title": "Coordinateur Flotte & Transit Portuaire",
        "description": (
            "Sahel Logistique est un opérateur de transit spécialisé dans l'acheminement de marchandises "
            "depuis le Port Autonome de Cotonou vers les pays enclavés d'Afrique de l'Ouest "
            "(Niger, Burkina Faso, Mali). Nous recrutons un Coordinateur Flotte senior pour piloter "
            "nos opérations de transit et garantir la fluidité de la chaîne logistique.\n\n"
            "Missions et responsabilités :\n"
            "• Planifier et superviser le transit des marchandises (maritime, ferroviaire et routier)\n"
            "• Gérer une flotte de 20 camions gros tonnage : maintenance préventive, planning chauffeurs\n"
            "• Coordonner les formalités douanières et les procédures de dédouanement au Port de Cotonou\n"
            "• Négocier les tarifs de fret avec les transitaires, compagnies maritimes et sous-traitants\n"
            "• Suivre les indicateurs clés (taux de livraison à temps, coût par tonne, taux d'immobilisation)\n"
            "• Gérer les litiges et sinistres avec les assureurs et les clients\n\n"
            "Profil recherché :\n"
            "• Bac+3 minimum en logistique, transport ou commerce international\n"
            "• 3 ans minimum d'expérience en milieu portuaire, douanier ou transitaire\n"
            "• Excellente connaissance des procédures douanières UEMOA et CEDEAO\n"
            "• Maîtrise des logiciels de gestion de flotte (Fleet Manager, Trimble ou équivalent)\n"
            "• Résistance au stress et capacité à gérer plusieurs urgences simultanément\n"
            "• Réseau établi auprès des autorités portuaires et douanières du Bénin (un atout)\n\n"
            "Avantages du poste :\n"
            "• Rémunération attractive + prime trimestrielle sur objectifs de livraison\n"
            "• Véhicule de service et téléphone professionnel\n"
            "• Prise en charge des repas sur site portuaire\n"
            "• Plan d'épargne retraite complémentaire\n"
            "• Évolution vers un poste de Directeur des Opérations sous 2 à 3 ans"
        ),
        "status": "active",
        "is_remote": False,
        "formatted_address": "Zone Portuaire, Cotonou, Bénin",
        "lon": 2.4280,
        "lat": 6.3650,
        "required_skills": ["Logistique portuaire", "Douanes", "Transit", "Gestion de flotte"],
    },
    {
        "company_slug": "afripay-solutions",
        "title": "Chef de Projet Produit (Paiements mobiles Afrique)",
        "description": (
            "AfriPay Solutions déploie sa passerelle de paiement auprès des marchands européens "
            "souhaitant encaisser en Mobile Money africain (Orange Money, MTN MoMo, Wave). "
            "Nous recrutons un Chef de Projet Produit basé en France pour piloter ce déploiement "
            "et coordonner les équipes entre Paris, Lomé et Abidjan.\n\n"
            "Missions et responsabilités :\n"
            "• Définir la feuille de route produit en collaboration avec les équipes tech et commerciales\n"
            "• Rédiger les spécifications fonctionnelles et les user stories pour l'équipe de développement\n"
            "• Piloter les sprints Agile/Scrum et animer les cérémonies (planning, rétrospective, démo)\n"
            "• Coordonner l'intégration de la passerelle AfriPay chez les marchands partenaires\n"
            "• Suivre les KPIs produit (taux de conversion, volume de transactions, NPS marchands)\n"
            "• Réaliser des déplacements trimestriels à Lomé et Abidjan pour les revues stratégiques\n\n"
            "Profil recherché :\n"
            "• Bac+5 école d'ingénieurs, école de commerce ou équivalent\n"
            "• 4 ans minimum en Product Management, idéalement dans la fintech ou les paiements\n"
            "• Maîtrise des méthodologies Agile/Scrum et des outils associés (Jira, Confluence, Notion)\n"
            "• Bonne compréhension des APIs REST et des flux de paiement en ligne\n"
            "• Excellentes compétences relationnelles et de communication en français et en anglais\n"
            "• Curiosité pour les marchés africains et les enjeux de l'inclusion financière\n\n"
            "Avantages du poste :\n"
            "• Télétravail partiel (3 jours/semaine) avec bureau à Paris 8e\n"
            "• Package compétitif : fixe + variable + BSPCE (startup en Série A)\n"
            "• Prise en charge intégrale des déplacements à Lomé et Abidjan\n"
            "• Mutuelle Alan + tickets restaurant Swile\n"
            "• Rejoindre une équipe pionnière de la diaspora fintech africaine"
        ),
        "status": "active",
        "is_remote": True,
        "formatted_address": "Rue de la Boétie, Paris 8e, France",
        "lon": 2.3120,
        "lat": 48.8730,
        "required_skills": ["Product Management", "Fintech", "Agile/Scrum", "API REST"],
    },
]

RECRUITERS: list[dict[str, str]] = [
    {
        "email": "recruteur.ecotech@etp-demo.tg",
        "first_name": "Koffi",
        "last_name": "Agbodjan",
        "company_slug": "ecotech-lome",
    },
    {
        "email": "recruteur.afripay@etp-demo.tg",
        "first_name": "Ablavi",
        "last_name": "Mensah",
        "company_slug": "afripay-solutions",
    },
    {
        "email": "rh@santeplus-ci.com",
        "first_name": "Amadou",
        "last_name": "Koné",
        "company_slug": "santeplus-abidjan",
    },
    {
        "email": "talents@dakarcode.sn",
        "first_name": "Fatou",
        "last_name": "Diop",
        "company_slug": "dakar-code-academy",
    },
    {
        "email": "recrutement@sahel-logistique.bj",
        "first_name": "Codjo",
        "last_name": "Dossou",
        "company_slug": "sahel-logistique",
    },
]

CANDIDATES: list[dict[str, Any]] = [
    {
        "email": "kodjo.cand@etp-demo.tg",
        "first_name": "Kodjo",
        "last_name": "Lawson",
        "raw_address": "Lomé, Togo",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
    },
    {
        "email": "afi.cand@etp-demo.tg",
        "first_name": "Afi",
        "last_name": "Gbégan",
        "raw_address": "Aného, Togo",
        "skills": ["Agronomie", "SIG", "Gestion de projet", "Excel avancé"],
    },
    {
        "email": "yao.cand@etp-demo.tg",
        "first_name": "Yao",
        "last_name": "Kombaté",
        "raw_address": "Kara, Togo",
        "skills": ["React Native", "TypeScript", "JavaScript", "HTML/CSS"],
    },
    {
        "email": "aminata.cand@etp-demo.sn",
        "first_name": "Aminata",
        "last_name": "Bâ",
        "raw_address": "Dakar, Sénégal",
        "skills": ["Pédagogie", "Python", "Scratch", "Communication"],
    },
    {
        "email": "bakary.cand@etp-demo.ci",
        "first_name": "Bakary",
        "last_name": "Traoré",
        "raw_address": "Abidjan, Côte d'Ivoire",
        "skills": ["Soins infirmiers", "Urgences", "Premiers secours"],
    },
    {
        "email": "charlotte.cand@etp-demo.bj",
        "first_name": "Charlotte",
        "last_name": "Adovi",
        "raw_address": "Cotonou, Bénin",
        "skills": ["Logistique portuaire", "Douanes", "Transit", "SAP"],
    },
]

DEMO_PASSWORD = "Demo@ETP2026!"


def _make_point(lon: float, lat: float) -> str:
    return f"SRID=4326;POINT({lon} {lat})"


async def _get_or_create_company(session: AsyncSession, data: dict[str, Any]) -> Company:
    res = await session.execute(select(Company).where(Company.slug == str(data["slug"])))
    company = res.scalar_one_or_none()
    if not company:
        company = Company(
            id=str(uuid.uuid4()),
            name=str(data["name"]),
            slug=str(data["slug"]),
            siret=data.get("siret"),
            is_active=True,
        )
        session.add(company)
        await session.flush()
        print(f"  [CREE] Entreprise : {company.name}")
    else:
        print(f"  [EXISTE] Entreprise : {company.name}")
    return company


async def _get_or_create_job(session: AsyncSession, company: Company, data: dict[str, Any]) -> Job:
    res = await session.execute(
        select(Job).where(Job.title == str(data["title"]), Job.company_id == str(company.id))
    )
    job = res.scalar_one_or_none()
    if not job:
        point = _make_point(float(data["lon"]), float(data["lat"])) if data.get("lon") else None
        job = Job(
            id=str(uuid.uuid4()),
            company_id=str(company.id),
            title=str(data["title"]),
            description=str(data["description"]),
            status=JobStatus(str(data["status"])),
            is_remote=bool(data.get("is_remote", False)),
            formatted_address=str(data["formatted_address"]) if data.get("formatted_address") else None,
            required_skills=list(data.get("required_skills", [])),
        )
        if point:
            job.job_location = point  # type: ignore[assignment]
        session.add(job)
        await session.flush()
        print(f"    [CREE] Offre : {job.title}")
    else:
        # Mise à jour de la description et des compétences si l'offre existe déjà
        job.description = str(data["description"])
        job.required_skills = list(data.get("required_skills", []))
        job.is_remote = bool(data.get("is_remote", False))
        await session.flush()
        print(f"    [MIS A JOUR] Offre : {job.title}")
    return job


async def _get_or_create_user(
    session: AsyncSession,
    email: str,
    first_name: str,
    last_name: str,
    role: UserRole,
    company_id: str | None = None,
    raw_address: str | None = None,
    skills: list[str] | None = None,
) -> User:
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            hashed_password=get_password_hash(DEMO_PASSWORD),
            role=role,
            is_active=True,
            is_verified=True,
            company_id=company_id,
        )
        session.add(user)
        await session.flush()

        from src.modules.users.models import Profile
        profile = Profile(
            id=str(uuid.uuid4()),
            user_id=str(user.id),
            first_name=first_name,
            last_name=last_name,
            raw_address=raw_address,
            skills=skills or [],
        )
        session.add(profile)
        await session.flush()
        print(f"  [CREE] Utilisateur : {email} ({role.value})")
    else:
        print(f"  [EXISTE] Utilisateur : {email}")
    return user


async def seed():
    raw_url = os.environ.get("DATABASE_URL", str(settings.DATABASE_URL))
    db_url = _normalize_postgres_url(raw_url)

    engine = create_async_engine(db_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        print("\n--- Seed : Entreprises ---")
        companies: dict[str, Company] = {}
        for c in COMPANIES:
            slug = str(c["slug"])
            companies[slug] = await _get_or_create_company(session, c)

        print("\n--- Seed : Offres d'emploi ---")
        for j in JOBS_DATA:
            company_slug = str(j["company_slug"])
            company = companies[company_slug]
            await _get_or_create_job(session, company, j)

        print("\n--- Seed : Recruteurs de démo ---")
        for r in RECRUITERS:
            recruiter_slug = r["company_slug"]
            company = companies[recruiter_slug]
            await _get_or_create_user(
                session,
                email=r["email"],
                first_name=r["first_name"],
                last_name=r["last_name"],
                role=UserRole.RECRUITER,
                company_id=str(company.id),
            )

        print("\n--- Seed : Candidats de démo ---")
        for cand in CANDIDATES:
            raw_skills = cand.get("skills")
            skills_list = [str(s) for s in raw_skills] if isinstance(raw_skills, list) else []
            addr = str(cand["raw_address"]) if cand.get("raw_address") else None
            await _get_or_create_user(
                session,
                email=str(cand["email"]),
                first_name=str(cand["first_name"]),
                last_name=str(cand["last_name"]),
                role=UserRole.CANDIDATE,
                raw_address=addr,
                skills=skills_list,
            )

        await session.commit()

    await engine.dispose()
    print("\n[OK] Seed terminé avec succès.\n")
    print("Comptes de démo créés (mot de passe : Demo@ETP2026!) :")
    print("  Recruteurs :")
    for r in RECRUITERS:
        print(f"    {r['email']} - {r['company_slug']}")
    print("  Candidats :")
    for cand in CANDIDATES:
        print(f"    {cand['email']}")


if __name__ == "__main__":
    asyncio.run(seed())
