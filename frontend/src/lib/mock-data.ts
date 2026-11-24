import type {
  Job,
  Application,
  UserBriefResponse,
  Interview,
  CandidateResume,
  AnalyticsDashboard,
} from "@/types/domain";

/**
 * Calcule une date ISO rétroactive à partir d'un nombre de jours.
 *
 * @param daysAgo - Nombre de jours écoulés
 * @returns Date au format ISO
 */
const D = (daysAgo: number): string =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

/**
 * Offres d'emploi de démonstration situées au Togo, en Afrique de l'Ouest
 * et à l'international pour alimenter les parcours candidats et recruteurs.
 */
export const MOCK_OFFRES: Job[] = [
  {
    id: "mock-job-001",
    title: "Développeur Full Stack (React / FastAPI)",
    description:
      "Rejoignez notre équipe tech pour concevoir des solutions numériques innovantes pour le marché togolais et ouest-africain. Vous participerez à l'architecture et au développement de nos applications web.",
    company_id: "mock-co-001",
    company_name: "TogoTech Solutions",
    status: "active",
    is_remote: false,
    formatted_address: "Lomé, Togo",
    required_skills: ["React", "FastAPI", "PostgreSQL", "TypeScript", "Python"],
    created_at: D(5),
  },
  {
    id: "mock-job-002",
    title: "Responsable Marketing Digital",
    description:
      "Nous cherchons un(e) Responsable Marketing Digital pour piloter notre stratégie de croissance sur les marchés d'Afrique de l'Ouest. Expérience en campagnes Meta, Google Ads et influenceurs locaux souhaitée.",
    company_id: "mock-co-002",
    company_name: "Golfe Finance Group",
    status: "active",
    is_remote: true,
    formatted_address: "Lomé, Togo",
    required_skills: ["Marketing digital", "SEO", "Meta Ads", "Google Analytics", "Copywriting"],
    created_at: D(10),
  },
  {
    id: "mock-job-003",
    title: "Ingénieur DevOps / Cloud",
    description:
      "Infrastructure cloud AWS pour nos services B2B déployés au Sénégal, en Côte d'Ivoire et au Togo. Mise en place de pipelines CI/CD, monitoring et sécurité des environnements de production.",
    company_id: "mock-co-003",
    company_name: "Dakar Cloud Systems",
    status: "active",
    is_remote: true,
    formatted_address: "Dakar, Sénégal",
    required_skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux"],
    created_at: D(7),
  },
  {
    id: "mock-job-004",
    title: "Analyste Données & Business Intelligence",
    description:
      "Poste basé à Abidjan, au sein de notre département analytique. Vous construirez des tableaux de bord décisionnels, automatiserez des rapports et accompagnerez les équipes métier dans l'exploitation des données.",
    company_id: "mock-co-004",
    company_name: "Côte d'Ivoire Data Hub",
    status: "active",
    is_remote: false,
    formatted_address: "Abidjan, Côte d'Ivoire",
    required_skills: ["SQL", "Power BI", "Python", "Excel avancé", "ETL"],
    created_at: D(14),
  },
  {
    id: "mock-job-005",
    title: "Chef de Projet IT",
    description:
      "Pilotage de projets de transformation numérique pour le compte d'institutions publiques et privées au Bénin. Coordination d'équipes pluridisciplinaires, suivi budgétaire et reporting à la direction.",
    company_id: "mock-co-005",
    company_name: "Bénin Innov",
    status: "active",
    is_remote: false,
    formatted_address: "Cotonou, Bénin",
    required_skills: ["Gestion de projet", "Agile", "JIRA", "MS Project", "Leadership"],
    created_at: D(3),
  },
  {
    id: "mock-job-006",
    title: "Développeur Mobile (React Native)",
    description:
      "Développement d'applications mobiles Android et iOS pour notre plateforme de paiement mobile ciblant l'Afrique subsaharienne. Intégration avec des APIs de paiement mobile money (Orange Money, MTN MoMo).",
    company_id: "mock-co-003",
    company_name: "Dakar Cloud Systems",
    status: "active",
    is_remote: true,
    formatted_address: "Dakar, Sénégal",
    required_skills: ["React Native", "TypeScript", "REST API", "Mobile Money", "Expo"],
    created_at: D(2),
  },
  {
    id: "mock-job-007",
    title: "Comptable Senior",
    description:
      "Gestion de la comptabilité générale et analytique, supervision des déclarations fiscales et participation aux audits pour notre groupe industriel implanté à Lomé.",
    company_id: "mock-co-001",
    company_name: "TogoTech Solutions",
    status: "active",
    is_remote: false,
    formatted_address: "Lomé, Togo",
    required_skills: ["Comptabilité", "SYSCOHADA", "Sage", "Fiscalité", "Excel"],
    created_at: D(20),
  },
  {
    id: "mock-job-008",
    title: "UX / Product Designer",
    description:
      "Conception d'expériences utilisateur centrées sur les besoins des marchés émergents. Maîtrise de Figma, conduite d'entretiens utilisateurs et production de prototypes interactifs.",
    company_id: "mock-co-002",
    company_name: "Golfe Finance Group",
    status: "active",
    is_remote: true,
    formatted_address: "Lomé, Togo",
    required_skills: ["Figma", "UX Research", "Prototypage", "Design System", "A/B Testing"],
    created_at: D(6),
  },
  {
    id: "mock-job-009",
    title: "Consultant en Cybersécurité",
    description:
      "Audit de sécurité, tests d'intrusion et accompagnement dans la mise en conformité ISO 27001 pour des clients bancaires et télécoms en Afrique de l'Ouest et en Europe.",
    company_id: "mock-co-006",
    company_name: "SecureAfrik",
    status: "active",
    is_remote: false,
    formatted_address: "Ouagadougou, Burkina Faso",
    required_skills: ["Pentest", "ISO 27001", "SIEM", "SOC", "Linux", "Network Security"],
    created_at: D(9),
  },
  {
    id: "mock-job-010",
    title: "Chargé(e) de Communication & Relations Presse",
    description:
      "Production de contenus, gestion des réseaux sociaux et relations avec les médias pour une ONG environnementale opérant au Togo, Ghana et Côte d'Ivoire.",
    company_id: "mock-co-007",
    company_name: "GreenWest Africa",
    status: "active",
    is_remote: false,
    formatted_address: "Accra, Ghana",
    required_skills: ["Communication", "Rédaction", "Réseaux sociaux", "Canva", "Relations presse"],
    created_at: D(1),
  },
];

/**
 * Profils candidats factices pour la démonstration du vivier recruteur.
 */
export const MOCK_CANDIDATS: UserBriefResponse[] = [
  {
    id: "mock-cand-001",
    email: "kodjo.mensah@example.tg",
    nom_complet: "Kodjo Mensah",
    titre: "Développeur Full Stack",
    localisation: "Lomé, Togo",
    profil_public: true,
    recherchable: true,
    has_cv: true,
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
    experiences: [
      {
        poste: "Développeur Frontend",
        entreprise: "TogoTech Solutions",
        type_contrat: "CDI",
        date_debut: "2023-03-01",
        date_fin: null,
        en_cours: true,
      },
    ],
    formations: [
      {
        diplome: "Licence Informatique",
        etablissement: "Université de Lomé",
        domaine: "Informatique",
        annee: 2022,
      },
    ],
  },
  {
    id: "mock-cand-002",
    email: "afi.agbodjan@example.tg",
    nom_complet: "Afi Agbodjan",
    titre: "Chargée de Communication Digitale",
    localisation: "Lomé, Togo",
    profil_public: true,
    recherchable: true,
    has_cv: true,
    skills: ["Marketing digital", "SEO", "Google Analytics", "Meta Ads"],
    experiences: [
      {
        poste: "Chargée de communication",
        entreprise: "Lomé Media Group",
        type_contrat: "CDD",
        date_debut: "2022-01-01",
        date_fin: "2024-05-01",
        en_cours: false,
      },
    ],
    formations: [
      {
        diplome: "Master Marketing & Communication",
        etablissement: "UCAO-UUTg",
        domaine: "Marketing",
        annee: 2022,
      },
    ],
  },
  {
    id: "mock-cand-003",
    email: "kwame.asante@example.gh",
    nom_complet: "Kwame Asante",
    titre: "Data Analyst / ML Enthusiast",
    localisation: "Accra, Ghana",
    profil_public: true,
    recherchable: true,
    has_cv: false,
    skills: ["Python", "SQL", "Power BI", "Machine Learning"],
    experiences: [
      {
        poste: "Data Analyst",
        entreprise: "Ghana Digital Services",
        type_contrat: "CDI",
        date_debut: "2021-06-01",
        date_fin: null,
        en_cours: true,
      },
    ],
    formations: [
      {
        diplome: "BSc Computer Science",
        etablissement: "University of Ghana",
        domaine: "Sciences informatiques",
        annee: 2021,
      },
    ],
  },
  {
    id: "mock-cand-004",
    email: "aminata.diallo@example.sn",
    nom_complet: "Aminata Diallo",
    titre: "Product Designer UI/UX",
    localisation: "Dakar, Sénégal",
    profil_public: true,
    recherchable: true,
    has_cv: true,
    skills: ["Figma", "UX Research", "Prototypage", "Adobe XD"],
    experiences: [
      {
        poste: "Product Designer",
        entreprise: "Dakar Cloud Systems",
        type_contrat: "CDI",
        date_debut: "2022-09-01",
        date_fin: null,
        en_cours: true,
      },
    ],
    formations: [
      {
        diplome: "Licence Design Graphique",
        etablissement: "ESMT Dakar",
        domaine: "Design numérique",
        annee: 2022,
      },
    ],
  },
  {
    id: "mock-cand-005",
    email: "felix.koffi@example.ci",
    nom_complet: "Félix Koffi",
    titre: "Ingénieur Cloud & DevOps",
    localisation: "Abidjan, Côte d'Ivoire",
    profil_public: true,
    recherchable: true,
    has_cv: true,
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Linux"],
    experiences: [
      {
        poste: "Ingénieur Systèmes",
        entreprise: "Côte d'Ivoire Telecom",
        type_contrat: "CDI",
        date_debut: "2020-02-01",
        date_fin: "2023-11-01",
        en_cours: false,
      },
      {
        poste: "DevOps Engineer",
        entreprise: "Côte d'Ivoire Data Hub",
        type_contrat: "CDI",
        date_debut: "2023-12-01",
        date_fin: null,
        en_cours: true,
      },
    ],
    formations: [
      {
        diplome: "Master Réseaux et Systèmes",
        etablissement: "INPHB Yamoussoukro",
        domaine: "Ingénierie informatique",
        annee: 2020,
      },
    ],
  },
];

/**
 * Candidatures de démonstration associées aux offres régionales.
 */
export const MOCK_CANDIDATURES: Application[] = [
  {
    id: "mock-app-001",
    job_id: "mock-job-001",
    candidate_id: "mock-cand-001",
    job_title: "Développeur Full Stack (React / FastAPI)",
    company_name: "TogoTech Solutions",
    stage: "interview",
    matching_score: 87,
    created_at: D(12),
    updated_at: D(2),
  },
  {
    id: "mock-app-002",
    job_id: "mock-job-003",
    candidate_id: "mock-cand-001",
    job_title: "Ingénieur DevOps / Cloud",
    company_name: "Dakar Cloud Systems",
    stage: "screening",
    matching_score: 74,
    created_at: D(8),
    updated_at: D(5),
  },
  {
    id: "mock-app-003",
    job_id: "mock-job-008",
    candidate_id: "mock-cand-001",
    job_title: "UX / Product Designer",
    company_name: "Golfe Finance Group",
    stage: "applied",
    matching_score: 62,
    created_at: D(3),
    updated_at: D(3),
  },
  {
    id: "mock-app-004",
    job_id: "mock-job-007",
    candidate_id: "mock-cand-001",
    job_title: "Comptable Senior",
    company_name: "TogoTech Solutions",
    stage: "rejected",
    matching_score: 41,
    created_at: D(25),
    updated_at: D(15),
  },
];

/**
 * Entretiens planifiés pour le suivi candidat et recruteur.
 */
export const MOCK_ENTRETIENS: Interview[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    application_id: "00000000-0000-0000-0000-000000000011",
    interviewer_id: "00000000-0000-0000-0000-000000000021",
    job_title: "Développeur Full Stack (React / FastAPI)",
    candidate_name: "Kodjo Mensah",
    company_name: "TogoTech Solutions",
    scheduled_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    duration_minutes: 60,
    meeting_link: "https://meet.google.com/mock-link",
    location: "En ligne (Google Meet)",
    status: "scheduled",
    notes: "Préparer un exercice technique React + API REST.",
    created_at: D(5),
    updated_at: D(1),
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    application_id: "00000000-0000-0000-0000-000000000012",
    interviewer_id: "00000000-0000-0000-0000-000000000022",
    job_title: "Ingénieur DevOps / Cloud",
    candidate_name: "Félix Koffi",
    company_name: "Dakar Cloud Systems",
    scheduled_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    duration_minutes: 45,
    meeting_link: "https://zoom.us/j/mock-link",
    location: "En ligne (Zoom)",
    status: "scheduled",
    notes: "Questions sur Kubernetes et Terraform.",
    created_at: D(3),
    updated_at: D(1),
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    application_id: "00000000-0000-0000-0000-000000000013",
    interviewer_id: "00000000-0000-0000-0000-000000000023",
    job_title: "UX / Product Designer",
    candidate_name: "Aminata Diallo",
    company_name: "Golfe Finance Group",
    scheduled_at: D(10),
    duration_minutes: 30,
    meeting_link: null,
    location: "+228 90 00 00 01 (Entretien téléphonique)",
    status: "completed",
    notes: "Candidature très solide. Passer en offre.",
    created_at: D(15),
    updated_at: D(10),
  },
];

/**
 * Indicateurs résumés pour l'espace candidat.
 */
export const MOCK_RESUME_CANDIDAT: CandidateResume = {
  vues_profil: 23,
  evolution_vues: 5,
  nouveaux_matchs: 3,
  candidatures_actives: 3,
  taux_entretien: 25,
  taux_offre: 0,
};

/**
 * Tableau de bord d'analyse pour l'espace recruteur.
 */
export const MOCK_DASHBOARD_RECRUTEUR: AnalyticsDashboard = {
  pipeline: {
    total_applications: 42,
    by_stage: {
      applied: 18,
      screening: 12,
      interview: 7,
      offer: 3,
      hired: 1,
      rejected: 1,
    },
    avg_matching_score: 71.4,
  },
  jobs: {
    total_jobs: 10,
    active_jobs: 8,
    closed_jobs: 2,
    avg_applications_per_job: 4.2,
  },
  funnel: {
    applied: 42,
    screening: 24,
    interview: 12,
    offer: 5,
    hired: 2,
    rejected: 4,
  },
  top_skills: [
    { skill: "Python", count: 8, percentage: 80 },
    { skill: "React", count: 7, percentage: 70 },
    { skill: "SQL", count: 6, percentage: 60 },
    { skill: "Docker", count: 5, percentage: 50 },
    { skill: "Figma", count: 4, percentage: 40 },
    { skill: "Marketing digital", count: 4, percentage: 40 },
    { skill: "TypeScript", count: 4, percentage: 40 },
  ],
};
