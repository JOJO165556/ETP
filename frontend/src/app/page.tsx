import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarCheck,
  FileText,
  Send,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const PARCOURS_CANDIDAT = [
  {
    Icone: FileText,
    titre: "Déposez votre CV",
    texte: "Votre parcours est repris automatiquement. Vous corrigez ce qui doit l'être.",
  },
  {
    Icone: Briefcase,
    titre: "Recevez des offres ciblées",
    texte: "Les postes affichés correspondent à vos compétences et à votre zone de déplacement.",
  },
  {
    Icone: CalendarCheck,
    titre: "Suivez chaque étape",
    texte: "Vous savez à tout moment où en est votre candidature, sans relancer personne.",
  },
];

const PARCOURS_RECRUTEUR = [
  {
    Icone: Send,
    titre: "Publiez une offre",
    texte: "Le poste est visible immédiatement par les candidats concernés.",
  },
  {
    Icone: Users,
    titre: "Évaluez les candidatures",
    texte: "Les profils sont classés par pertinence, avec les notes de votre équipe.",
  },
  {
    Icone: CalendarCheck,
    titre: "Planifiez les entretiens",
    texte: "Les rendez-vous sont posés sans double réservation et confirmés par email.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/etp_logo.webp"
              alt="ETP"
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="text-base font-semibold tracking-tight">ETP</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#talents"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pour les candidats
            </a>
            <a
              href="#entreprises"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pour les entreprises
            </a>
            <a
              href="#fonctionnement"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Fonctionnement
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
              Se connecter
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Recrutement nouvelle génération
              </span>
              <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Recruter sans perdre de temps, postuler sans se perdre.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                ETP réunit dans un seul espace les offres, les candidatures et les entretiens.
                Les candidats suivent l&apos;avancement de leur dossier. Les équipes recrutement
                gardent une vue claire sur chaque décision.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" className="gap-2 shadow-sm" render={<Link href="/register?role=candidate" />}>
                  <User size={17} aria-hidden="true" />
                  Créer un compte candidat
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  render={<Link href="/register?role=recruiter" />}
                >
                  <Building2 size={17} aria-hidden="true" />
                  Créer un espace entreprise
                </Button>
              </div>

              <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground">
                <li className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success shrink-0" aria-hidden="true" />
                  Données cloisonnées par entreprise
                </li>
                <li className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success shrink-0" aria-hidden="true" />
                  CV consultés par lien temporaire
                </li>
                <li className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success shrink-0" aria-hidden="true" />
                  Accès et suppression sécurisés
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-sm sm:p-8">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-destructive/80" />
                    <span className="flex h-3 w-3 rounded-full bg-warning/80" />
                    <span className="flex h-3 w-3 rounded-full bg-success/80" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Aperçu en direct</span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">Score de correspondance</span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">88%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: "88%" }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Compétences vérifiées : Python, FastAPI, React
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">Prochain entretien</span>
                      <span className="rounded bg-success/10 px-2 py-0.5 font-semibold text-success">Confirmé</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      Développeur Full Stack · Lomé, Togo
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demain à 10h00 · Visioconférence
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">Étape de candidature</span>
                      <span className="text-muted-foreground">Étape 3 sur 5</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-1 text-[11px] font-medium">
                      <span className="text-success font-semibold">Envoyée</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success font-semibold">Présélection</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-primary font-bold">Entretien</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="fonctionnement"
          className="scroll-mt-20 border-y border-border bg-muted/30 py-16 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Comment ça se passe
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Le même parcours, vu des deux côtés.
            </p>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <User size={16} className="text-primary" aria-hidden="true" />
                  Côté candidat
                </h3>
                <ol className="mt-5 space-y-5">
                  {PARCOURS_CANDIDAT.map(({ Icone, titre, texte }, index) => (
                    <li key={titre} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Icone size={14} className="text-muted-foreground" aria-hidden="true" />
                          {titre}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {texte}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 size={16} className="text-primary" aria-hidden="true" />
                  Côté entreprise
                </h3>
                <ol className="mt-5 space-y-5">
                  {PARCOURS_RECRUTEUR.map(({ Icone, titre, texte }, index) => (
                    <li key={titre} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Icone size={14} className="text-muted-foreground" aria-hidden="true" />
                          {titre}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {texte}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <article
              id="talents"
              className="scroll-mt-24 flex flex-col rounded-xl border border-border bg-card p-7 sm:p-8"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User size={19} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                Pour les candidats
              </h2>
              <ul className="mt-5 flex-1 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Un profil construit à partir de votre CV, que vous pouvez corriger à tout
                  moment.
                </li>
                <li>
                  Des offres filtrées par compétences et par distance réelle depuis chez vous.
                </li>
                <li>
                  Un suivi transparent : chaque candidature indique son étape et la prochaine
                  action attendue.
                </li>
              </ul>
              <Button
                className="mt-7 w-full gap-2"
                render={<Link href="/register?role=candidate" />}
              >
                Créer mon compte
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </article>

            <article
              id="entreprises"
              className="scroll-mt-24 flex flex-col rounded-xl border border-border bg-card p-7 sm:p-8"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 size={19} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                Pour les entreprises
              </h2>
              <ul className="mt-5 flex-1 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>Publication et mise à jour des offres depuis un seul écran.</li>
                <li>
                  Candidatures classées par pertinence, avec notes et historique d&apos;étapes
                  partagés par l&apos;équipe.
                </li>
                <li>
                  Entretiens planifiés avec détection des conflits d&apos;agenda et confirmation
                  automatique.
                </li>
              </ul>
              <Button
                variant="outline"
                className="mt-7 w-full gap-2"
                render={<Link href="/register?role=recruiter" />}
              >
                Ouvrir un espace entreprise
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/etp_logo.webp"
              alt="ETP"
              width={24}
              height={24}
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="text-sm font-medium tracking-tight">ETP</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ETP. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
