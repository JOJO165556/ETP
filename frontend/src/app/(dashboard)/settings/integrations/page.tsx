import { Calendar, Mail, MessageSquare, Sparkles, Users, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";

const ACTIF = [
  {
    Icone: Mail,
    titre: "Notifications par email",
    description:
      "Confirmation de candidature, invitation à un entretien et décision finale sont envoyées automatiquement aux personnes concernées.",
  },
  {
    Icone: Calendar,
    titre: "Entretiens centralisés",
    description:
      "Chaque rendez-vous est enregistré avec sa durée, son lieu ou son lien de visioconférence, visible par l'équipe.",
  },
  {
    Icone: Users,
    titre: "Vivier d'entreprise",
    description:
      "Les profils candidats restent cloisonnés par entreprise. Aucun échange de données entre organisations.",
  },
];

const AVENIR = [
  { Icone: MessageSquare, titre: "Slack", description: "Alertes d'entretien dans vos canaux internes." },
  { Icone: Video, titre: "Microsoft Teams", description: "Création du lien de réunion depuis l'entretien." },
  { Icone: Calendar, titre: "Google Agenda", description: "Synchronisation des créneaux de l'équipe." },
  { Icone: Users, titre: "LinkedIn Recruiter", description: "Import des profils sourcés dans le vivier." },
  { Icone: Sparkles, titre: "Airtable et Notion", description: "Export des candidatures vers vos outils existants." },
];

export default function ConnexionsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6 lg:p-10">
      <PageHeader
        title="Connexions"
        description="Ce qui fonctionne aujourd'hui dans votre espace, et ce qui arrive ensuite."
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Disponible maintenant</h2>
        <ul className="space-y-2">
          {ACTIF.map(({ Icone, titre, description }) => (
            <li
              key={titre}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <Icone size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{titre}</p>
                  <Badge variant="success">Actif</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Prochainement</h2>
          <span className="text-xs text-muted-foreground">Feuille de route produit</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {AVENIR.map(({ Icone, titre, description }) => (
            <li key={titre} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Icone size={15} className="text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">{titre}</p>
                <Badge variant="outline" className="ml-auto">
                  À venir
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
