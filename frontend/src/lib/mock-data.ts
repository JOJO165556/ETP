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
    description: `TogoTech Solutions recrute un(e) Développeur Full Stack pour renforcer son pôle ingénierie logicielle à Lomé. Au sein d'une équipe agile pluridisciplinaire, vous participerez activement à la conception et au déploiement de solutions numériques à fort impact régional.

Missions et responsabilités :
• Développer et maintenir des interfaces web responsives et fluides avec React et Next.js.
• Concevoir des APIs REST et gRPC performantes et sécurisées avec FastAPI et SQLAlchemy async.
• Participer aux revues de code, tests unitaires (pytest, Jest) et intégration continue CI/CD.
• Collaborer étroitement avec les équipes produit et UX/UI pour optimiser l'expérience utilisateur.
• Assurer la veille technologique et contribuer à l'architecture logicielle du groupe.

Profil recherché :
• Bac+3 à Bac+5 en Informatique ou Génie Logiciel.
• Minimum 3 ans d'expérience sur un stack moderne (React/TypeScript et Python/FastAPI ou Node.js).
• Solide maîtrise des bases de données relationnelles PostgreSQL et de Redis.
• Familiarité avec les pratiques DevOps (Docker, Git, CI/CD).
• Esprit d'équipe, curiosité technique et rigueur d'ingénierie.

Avantages du poste :
• Rémunération compétitive selon grille et profil.
• Possibilité de 2 jours de télétravail par semaine.
• Prise en charge de la mutuelle santé à 80%.
• Ordinateur portable professionnel haut de gamme fourni.
• Budget annuel alloué aux formations et certifications techniques.`,
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
    description: `Golfe Finance Group recherche un(e) Responsable Marketing Digital pour piloter sa stratégie d'acquisition et d'engagement client sur l'ensemble de ses marchés en Afrique de l'Ouest.

Missions et responsabilités :
• Définir et exécuter la stratégie d'acquisition digitale multicanale (SEO, Google Ads, Meta Ads, LinkedIn).
• Piloter les campagnes de génération de leads pour nos produits de financement et microcrédit.
• Coordonner la création de contenus engageants (visuels, vidéos, articles) avec l'équipe design.
• Analyser les KPIs de performance (CAC, LTV, taux de conversion) via Google Analytics et Looker.
• Nouer et animer des partenariats avec les créateurs de contenu et relais d'opinion régionaux.

Profil recherché :
• Bac+4/5 en Marketing, Communication ou École de Commerce.
• Minimum 4 années d'expérience en marketing digital, idéalement dans la FinTech ou le secteur bancaire.
• Maîtrise avancée des plateformes publicitaires (Meta Business Suite, Google Ads, TikTok Ads).
• Excellentes compétences rédactionnelles et maîtrise des outils d'analyse de données.
• Leadership, autonomie et forte capacité d'adaptation à des marchés en évolution rapide.

Avantages du poste :
• Télétravail à 100% possible ou bureaux premium à Lomé.
• Primes trimestrielles sur objectifs de croissance.
• Forfait internet et communication pris en charge.
• Assurance santé groupe complète pour la famille.`,
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
    description: `Dakar Cloud Systems accompagne les grandes entreprises ouest-africaines dans leur transformation cloud. Nous recherchons un(e) Ingénieur DevOps pour automatiser, sécuriser et superviser nos infrastructures cloud hybrides.

Missions et responsabilités :
• Concevoir et déployer des infrastructures cloud résilientes sur AWS et environnements privés.
• Créer et industrialiser les pipelines CI/CD (GitHub Actions, GitLab CI) pour les équipes de dev.
• Mettre en place et administrer les clusters Kubernetes et orchestrateurs de conteneurs.
• Déployer des solutions de monitoring, métriques et logs centralisés (Prometheus, Grafana, ELK).
• Garantir la sécurité opérationnelle, la politique de sauvegarde et les plans de reprise d'activité (PRA).

Profil recherché :
• Formation Bac+5 en Informatique, Réseaux ou Systèmes Cloud.
• Au moins 3 ans d'expérience opérationnelle en tant que DevOps ou SRE.
• Maîtrise de Docker, Kubernetes, Terraform et Linux.
• Expérience confirmée sur AWS ou Google Cloud Platform.
• Forte sensibilité aux problématiques de sécurité et haute disponibilité.

Avantages du poste :
• Contrat avec flexibilité totale de travail (full remote ou présentiel à Dakar).
• Financement complet des certifications AWS et Kubernetes (CKA).
• Indemnité d'équipement bureau à domicile.
• Assurance santé internationale premium.`,
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
    description: `Côte d'Ivoire Data Hub recherche un(e) Analyste Données & BI pour transformer les données opérationnelles de ses clients industriels et télécoms en leviers de décision stratégique.

Missions et responsabilités :
• Extraire, nettoyer et structurer les données issues de multiples sources opérationnelles (ETL).
• Développer des tableaux de bord interactifs et dashboards décisionnels sous Power BI et Tableau.
• Réaliser des analyses prédictives et statistiques pour identifier les tendances du marché.
• Former et accompagner les équipes métier à l'interprétation des rapports et indicateurs clés.
• Collaborer avec les équipes data engineering pour optimiser les entrepôts de données (Data Warehouse).

Profil recherché :
• Bac+4/5 en Data Science, Statistiques, Informatique Décisionnelle ou Économétrie.
• 2 à 4 ans d'expérience dans l'analyse de données ou la BI en entreprise.
• Excellente maîtrise de SQL et d'un outil de dataviz (Power BI de préférence).
• Bonnes notions de Python pour le traitement de données (Pandas, NumPy).
• Esprit d'analyse aiguisé, aisance relationnelle et clarté dans la communication des résultats.

Avantages du poste :
• Salaire attractif avec bonus sur performance annuelle.
• Cadre de travail moderne sur le plateau d'Abidjan.
• Mutuelle de santé d'entreprise prise en charge à 100%.
• Programme de mentorat interne et plans de formation continue.`,
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
    description: `Bénin Innov accompagne des institutions privées et publiques dans leurs programmes de dématérialisation. Nous recrutons un(e) Chef de Projet IT expérimenté(e) pour piloter des chantiers de transformation logicielle d'envergure.

Missions et responsabilités :
• Cadrer les besoins métiers, rédiger les cahiers des charges et spécifications fonctionnelles.
• Coordonner les équipes de développement, design et recette dans le respect des délais et budgets.
• Animer les cérémonies agiles (Scrum/Kanban) et assurer le suivi des sprints sous JIRA.
• Assurer le reporting régulier de l'avancement auprès du comité de direction et des parties prenantes.
• Conduire le changement et coordonner les sessions de formation des utilisateurs finaux.

Profil recherché :
• Diplôme d'Ingénieur ou Master en Gestion de Projet Informatique.
• 4 ans minimum d'expérience en gestion de projet digital en ESN ou grande entreprise.
• Certification Scrum Master ou PMP appréciée.
• Excellentes capacités managériales, leadership fédérateur et écoute active.
• Sens du résultat, gestion du stress et sens de la diplomatie.

Avantages du poste :
• Rémunération compétitive négociable selon expérience.
• Véhicule de fonction ou indemnité transport conséquente.
• Assurance maladie complète pour le collaborateur et sa famille.
• Cadre propice à l'évolution rapide vers des fonctions de direction de programme.`,
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
    description: `Dakar Cloud Systems développe une nouvelle génération d'applications mobiles financières et logistiques pour l'Afrique de l'Ouest. Nous recrutons un(e) Développeur Mobile React Native talentueux(se).

Missions et responsabilités :
• Développer des fonctionnalités mobiles modernes sous iOS et Android via React Native et Expo.
• Intégrer les APIs RESTful sécurisées et passerelles de paiement locales (Mobile Money, cartes bancaires).
• Optimiser les temps de chargement, la réactivité et la consommation de batterie des applications.
• Gérer le cycle de publication et de mise à jour sur l'App Store et Google Play Store.
• Collaborer avec les concepteurs UI pour respecter fidèlement les maquettes Figma.

Profil recherché :
• Bac+3/5 en Développement Informatique.
• 2 ans d'expérience avérée sur React Native / TypeScript avec applications publiées sur les stores.
• Connaissance des architectures mobiles propres et de la gestion d'état (Zustand, Redux Toolkit).
• Expérience avec les mécanismes de stockage local et fonctionnement offline-first.
• Sens du détail visuel et passion pour les animations fluides.

Avantages du poste :
• Poste en télétravail partiel ou total avec équipement fourni.
• Abonnement aux plateformes d'apprentissage tech (Coursera, Udemy).
• Couverture santé d'entreprise complète.
• Ambiance jeune, dynamique et internationale.`,
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
    description: `TogoTech Solutions recrute un(e) Comptable Senior pour superviser la comptabilité générale, fiscale et sociale de son groupe à Lomé. Vous assurerez la conformité intégrale avec le référentiel SYSCOHADA révisé.

Missions et responsabilités :
• Tenir et superviser la comptabilité générale, auxiliaire et analytique de l'entreprise.
• Réaliser les clôtures périodiques, l'établissement des états financiers de fin d'exercice et du bilan.
• Déclarer et télépayer l'ensemble des obligations fiscales (TVA, IRPP, BIC) et cotisations sociales CNSS.
• Coordonner les échanges avec les commissaires aux comptes et auditeurs externes.
• Assurer le suivi rigoureux de la trésorerie et la gestion des encaissements/décaissements.

Profil recherché :
• Bac+4/5 en Comptabilité, Contrôle de Gestion ou Finance (MSTCF, DSCG, Master CCA).
• Minimum 5 années d'expérience en cabinet comptable ou en entreprise commerciale/technologique.
• Maîtrise parfaite du référentiel SYSCOHADA révisé et des normes fiscales de l'UEMOA.
• Expertise sur le logiciel Sage 100 Comptabilité et maîtrise avancée d'Excel.
• Intégrité irréprochable, sens de la rigueur et discrétion professionnelle.

Avantages du poste :
• Salaire attractif selon profil + 13ème mois.
• Assurance santé prise en charge à 80% (salarié et ayants droit).
• Prime de bilan annuel et intéressement aux résultats.
• Cadre de travail agréable au centre d'affaires de Lomé.`,
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
    description: `Golfe Finance Group recherche un(e) UX / Product Designer pour façonner des expériences d'utilisation simples et mémorables sur nos plateformes web et mobiles.

Missions et responsabilités :
• Mener des recherches utilisateurs, entretiens qualitatifs et tests d'utilisabilité sur le terrain.
• Concevoir les parcours utilisateurs, wireframes, prototypes interactifs et maquettes haute fidélité sous Figma.
• Maintenir et enrichir le Design System de la marque en cohérence avec les équipes tech.
• Travailler en binôme avec les développeurs front-end pour garantir la fidélité de l'intégration.
• Mesurer l'impact des choix design à travers des tests A/B et des analyses quantitatives.

Profil recherché :
• Formation en Design d'interaction, Design Graphique ou équivalent avec portfolio solide.
• Au moins 3 ans d'expérience sur la conception d'applications web et mobiles.
• Maîtrise experte de Figma (composants auto-layout, variables, prototypage interactif).
• Compréhension des contraintes techniques frontend (HTML/CSS, responsive, accessibilité).
• Empathie utilisateur, sens aigu de l'esthétique et capacité à argumenter ses choix de design.

Avantages du poste :
• Télétravail possible avec équipement complet (MacBook Pro + écran 4K).
• Environnement créatif stimulant avec forte autonomie.
• Prise en charge des abonnements aux outils de veille et design.
• Mutuelle de groupe avantageuse.`,
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
    description: `SecureAfrik recrute un(e) Consultant(e) en Cybersécurité pour accompagner des institutions financières et opérateurs télécoms dans la protection de leurs actifs critiques.

Missions et responsabilités :
• Réaliser des audits de sécurité d'architecture, revues de configuration et tests d'intrusion (pentest web/infra).
• Accompagner les clients dans l'alignement sur les standards internationaux (ISO/IEC 27001, PCI-DSS).
• Participer à l'investigation d'incidents de sécurité et à l'analyse de compromission (forensics).
• Animer des sessions de sensibilisation aux menaces cyber et bonnes pratiques auprès des directions.
• Rédiger des rapports d'audit détaillés avec plans de remédiation pragmatiques et priorisés.

Profil recherché :
• Bac+5 en Cybersécurité ou Réseaux & Télécoms.
• 3 ans minimum dans le domaine de la sécurité offensive ou défensive.
• Certifications professionnelles reconnues bienvenues (CEH, OSCP, CISSP ou ISO 27001 Lead Auditor).
• Maîtrise des outils d'audit (Burp Suite, Nessus, Nmap, Metasploit) et environnements Linux.
• Éthique rigoureuse, pédagogie et qualités rédactionnelles confirmées.

Avantages du poste :
• Missions à forte visibilité auprès des fleurons économiques de la région.
• Primes substantielles sur missions réussies.
• Déplacements professionnels pris en charge intégralement.
• Couverture santé internationale.`,
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
    description: `GreenWest Africa recrute son/sa Chargé(e) de Communication & Relations Presse pour amplifier la visibilité de ses programmes de transition écologique et de reforestation en Afrique de l'Ouest.

Missions et responsabilités :
• Développer et mettre en œuvre le plan de communication annuel de l'ONG.
• Rédiger les communiqués de presse, dossiers de présentation et rapports d'activité.
• Organiser les points presse, interviews et conférences lors des grands sommets régionaux.
• Piloter la stratégie éditoriale sur les réseaux sociaux (LinkedIn, Twitter/X, Instagram, Facebook).
• Superviser la création de supports visuels et audiovisuels impactants avec les agences partenaires.

Profil recherché :
• Bac+4/5 en Journalisme, Sciences Politiques ou Communication Institutionnelle.
• Minimum 3 ans d'expérience en relations médias ou communication institutionnelle/ONG.
• Excellent carnet d'adresses journalistes et médias en Afrique de l'Ouest francophone et anglophone.
• Plume irréprochable en français et très bon niveau d'anglais professionnel.
• Passion pour les enjeux de développement durable et aisance dans la prise de parole publique.

Avantages du poste :
• Rôle à fort impact sociétal et environnemental.
• Équipe internationale bienveillante et solidaire.
• Opportunités régulières de voyages terrain dans la sous-région.
• Assurance médicale complète et indemnités de transport.`,
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
    id: "app-849201",
    job_id: "mock-job-001",
    candidate_id: "mock-cand-001",
    candidate_name: "Kodjo Mensah",
    job_title: "Développeur Full Stack (React / FastAPI)",
    company_name: "TogoTech Solutions",
    stage: "interview",
    matching_score: 87,
    created_at: D(12),
    updated_at: D(2),
  },
  {
    id: "app-720194",
    job_id: "mock-job-003",
    candidate_id: "mock-cand-002",
    candidate_name: "Amina Diallo",
    job_title: "Ingénieur DevOps / Cloud",
    company_name: "Dakar Cloud Systems",
    stage: "screening",
    matching_score: 74,
    created_at: D(8),
    updated_at: D(5),
  },
  {
    id: "app-639102",
    job_id: "mock-job-008",
    candidate_id: "mock-cand-003",
    candidate_name: "Koffi Amegan",
    job_title: "UX / Product Designer",
    company_name: "Golfe Finance Group",
    stage: "applied",
    matching_score: 62,
    created_at: D(3),
    updated_at: D(3),
  },
  {
    id: "app-519283",
    job_id: "mock-job-007",
    candidate_id: "mock-cand-004",
    candidate_name: "Fatou Sow",
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
    meeting_link: "https://meet.google.com/xyz-etp-interview",
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
    meeting_link: "https://zoom.us/j/1234567890",
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
