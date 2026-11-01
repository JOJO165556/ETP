import { CheckCircle2, Database, KeyRound, Lock, ShieldCheck, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";

const CONTROLES = [
  {
    Icone: KeyRound,
    titre: "Sessions protégées",
    description:
      "Les jetons de connexion sont conservés dans des cookies inaccessibles au code de la page. Chaque requête est vérifiée côté serveur.",
  },
  {
    Icone: UserCheck,
    titre: "Rôles et périmètres",
    description:
      "Quatre niveaux d'accès : administration, responsable d'entreprise, recruteur et candidat. Chaque donnée est rattachée à une entreprise.",
  },
  {
    Icone: Database,
    titre: "Cloisonnement des données",
    description:
      "Les profils, candidatures et notes d'une entreprise ne sont jamais visibles depuis une autre. Le contrôle est appliqué en base, pas seulement à l'écran.",
  },
  {
    Icone: Lock,
    titre: "Fichiers privés",
    description:
      "Les CV sont stockés dans un espace privé. Chaque consultation passe par un lien signé, valable quelques minutes.",
  },
  {
    Icone: ShieldCheck,
    titre: "Protection des échanges",
    description:
      "En-têtes de sécurité, politique d'origine stricte et limitation du nombre de requêtes pour prévenir les abus.",
  },
];

const DETAILS = [
  "Mots de passe stockés sous forme de condensat irréversible.",
  "Réinitialisation par lien à usage unique et à durée limitée.",
  "Journalisation des erreurs sans donnée personnelle.",
  "Droit d'accès et de suppression des données personnelles.",
];

export default function SecuritePage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6 lg:p-10">
      <PageHeader
        title="Sécurité"
        description="Les mesures réellement en place pour protéger les comptes et les données de recrutement."
      />

      <ul className="grid gap-2 sm:grid-cols-2">
        {CONTROLES.map(({ Icone, titre, description }) => (
          <li key={titre} className="rounded-xl border border-border bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icone size={17} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">{titre}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Bonnes pratiques appliquées</h2>
        <ul className="mt-4 space-y-2.5">
          {DETAILS.map((detail) => (
            <li key={detail} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              {detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Gestion des accès</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Les droits se règlent au niveau de chaque compte utilisateur, depuis le profil de
          l&apos;équipe. Un membre désactivé perd immédiatement l&apos;accès à toutes les données de
          l&apos;entreprise.
        </p>
      </section>
    </div>
  );
}
