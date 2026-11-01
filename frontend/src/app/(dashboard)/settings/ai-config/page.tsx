"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { aiService, type ReglesPreselection } from "@/services/ai.service";

const DEFAUT = { competences: 60, experience: 25, formation: 15 };

function versPourcent(valeur: number): number {
  return Math.round(Number(valeur) * 100);
}

function versRatio(valeur: number): number {
  return Math.round(valeur) / 100;
}

export default function ReglesPreselectionPage() {
  const [regles, setRegles] = useState<ReglesPreselection | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const [competences, setCompetences] = useState(DEFAUT.competences);
  const [experience, setExperience] = useState(DEFAUT.experience);
  const [formation, setFormation] = useState(DEFAUT.formation);
  const [seuilPreselection, setSeuilPreselection] = useState(80);
  const [seuilEcartement, setSeuilEcartement] = useState(25);
  const [miseAJourAuto, setMiseAJourAuto] = useState(true);
  const [comparaisonElargie, setComparaisonElargie] = useState(false);

  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreurEnregistrement, setErreurEnregistrement] = useState<string | null>(null);

  const appliquer = useCallback((valeurs: ReglesPreselection) => {
    setCompetences(versPourcent(valeurs.weight_skills));
    setExperience(versPourcent(valeurs.weight_experience));
    setFormation(versPourcent(valeurs.weight_education));
    setSeuilPreselection(Number(valeurs.threshold_screening));
    setSeuilEcartement(Number(valeurs.threshold_reject));
    setMiseAJourAuto(valeurs.auto_stage_update);
    setComparaisonElargie(valeurs.semantic_matching);
  }, []);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      const valeurs = await aiService.getRegles();
      setRegles(valeurs);
      appliquer(valeurs);
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, [appliquer]);

  useEffect(() => {
    charger();
  }, [charger]);

  const total = competences + experience + formation;
  const equilibre = total === 100;

  const erreurSeuils = useMemo(() => {
    if (seuilEcartement > seuilPreselection) {
      return "Le seuil d'écartement doit rester inférieur ou égal au seuil de présélection.";
    }
    return null;
  }, [seuilEcartement, seuilPreselection]);

  const enregistrer = async () => {
    if (!equilibre || erreurSeuils) return;
    setEnregistrement(true);
    setMessage(null);
    setErreurEnregistrement(null);
    try {
      const valeurs = await aiService.enregistrerRegles({
        weight_skills: versRatio(competences),
        weight_experience: versRatio(experience),
        weight_education: versRatio(formation),
        threshold_screening: seuilPreselection,
        threshold_reject: seuilEcartement,
        auto_stage_update: miseAJourAuto,
        semantic_matching: comparaisonElargie,
      });
      setRegles(valeurs);
      appliquer(valeurs);
      setMessage("Vos règles ont bien été enregistrées.");
    } catch {
      setErreurEnregistrement("L'enregistrement a échoué. Vérifiez votre connexion puis réessayez.");
    } finally {
      setEnregistrement(false);
    }
  };

  const reinitialiser = () => {
    setCompetences(DEFAUT.competences);
    setExperience(DEFAUT.experience);
    setFormation(DEFAUT.formation);
    setSeuilPreselection(80);
    setSeuilEcartement(25);
    setMiseAJourAuto(true);
    setComparaisonElargie(false);
    setMessage(null);
    setErreurEnregistrement(null);
  };

  if (chargement) {
    return (
      <div className="space-y-6 p-6 lg:p-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="p-6 lg:p-10">
        <StatePanel
          tone="error"
          title="Les règles de présélection sont indisponibles"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      </div>
    );
  }

  const curseurs = [
    {
      cle: "competences",
      libelle: "Compétences",
      aide: "Priorité donnée aux compétences attendues pour le poste.",
      valeur: competences,
      changer: setCompetences,
    },
    {
      cle: "experience",
      libelle: "Expérience",
      aide: "Durée et progression du parcours professionnel.",
      valeur: experience,
      changer: setExperience,
    },
    {
      cle: "formation",
      libelle: "Formation",
      aide: "Diplômes et domaines d'études.",
      valeur: formation,
      changer: setFormation,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Règles de présélection"
        description="Choisissez ce qui compte le plus lorsque les candidatures sont classées, et à partir de quand elles passent à l'étape suivante."
        actions={
          regles && (
            <Badge variant={regles.source === "defaults" ? "secondary" : "success"}>
              {regles.source === "defaults" ? "Valeurs par défaut" : "Personnalisées"}
            </Badge>
          )
        }
      />

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">Importance des critères</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              La somme doit être égale à 100 %. Ajustez un curseur, les autres restent inchangés.
            </p>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              equilibre ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            }`}
          >
            Total : {total} %
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {curseurs.map((curseur) => (
            <div key={curseur.cle}>
              <div className="flex items-center justify-between">
                <label htmlFor={curseur.cle} className="text-sm font-medium text-foreground">
                  {curseur.libelle}
                </label>
                <span className="text-sm font-semibold text-primary">{curseur.valeur} %</span>
              </div>
              <input
                id={curseur.cle}
                type="range"
                min={0}
                max={100}
                step={5}
                value={curseur.valeur}
                onChange={(event) => curseur.changer(Number(event.target.value))}
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">{curseur.aide}</p>
            </div>
          ))}
        </div>

        {!equilibre && (
          <p role="status" className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Ajustez les curseurs pour atteindre exactement 100 % avant d&apos;enregistrer.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Seuils de décision</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Exprimés sur 100. Une candidature au-dessus du seuil de présélection avance
          automatiquement ; en dessous du seuil d&apos;écartement, elle est écartée.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="seuil-preselection" className="text-sm font-medium text-foreground">
              Seuil de présélection
            </label>
            <input
              id="seuil-preselection"
              type="number"
              min={0}
              max={100}
              value={seuilPreselection}
              onChange={(event) => setSeuilPreselection(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div>
            <label htmlFor="seuil-ecartement" className="text-sm font-medium text-foreground">
              Seuil d&apos;écartement
            </label>
            <input
              id="seuil-ecartement"
              type="number"
              min={0}
              max={100}
              value={seuilEcartement}
              onChange={(event) => setSeuilEcartement(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        {erreurSeuils && (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {erreurSeuils}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Automatisation</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Mettre à jour l&apos;étape automatiquement</p>
              <p className="text-xs text-muted-foreground">
                La candidature avance dès que le seuil est atteint.
              </p>
            </div>
            <ToggleSwitch actif={miseAJourAuto} onChange={setMiseAJourAuto} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Comparaison élargie des intitulés</p>
              <p className="text-xs text-muted-foreground">
                Reconnaît les formulations proches d&apos;une même compétence.
              </p>
            </div>
            <ToggleSwitch actif={comparaisonElargie} onChange={setComparaisonElargie} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={reinitialiser} className="gap-2">
          <RotateCcw size={15} aria-hidden="true" />
          Rétablir les valeurs conseillées
        </Button>

        <div className="flex items-center gap-3">
          {regles?.updated_at && (
            <span className="text-xs text-muted-foreground">
              Dernière mise à jour le{" "}
              {new Date(regles.updated_at).toLocaleDateString("fr-FR")}
            </span>
          )}
          <Button
            onClick={enregistrer}
            disabled={!equilibre || Boolean(erreurSeuils) || enregistrement}
          >
            {enregistrement ? "Enregistrement..." : "Enregistrer les règles"}
          </Button>
        </div>
      </div>

      {message && (
        <p role="status" className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 size={15} aria-hidden="true" />
          {message}
        </p>
      )}
      {erreurEnregistrement && (
        <p role="alert" className="text-sm text-destructive">
          {erreurEnregistrement}
        </p>
      )}
    </div>
  );
}
