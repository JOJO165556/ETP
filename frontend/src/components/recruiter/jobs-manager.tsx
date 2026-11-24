"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Briefcase, Loader2, Plus } from "lucide-react";

import { jobsService } from "@/services/jobs.service";
import { JobFormModal } from "@/components/shared/job-form-modal";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_OFFRES } from "@/lib/mock-data";
import type { Job, JobStatus } from "@/types/domain";

const LIBELLES_STATUT: Record<JobStatus, string> = {
  draft: "Brouillon",
  active: "Publiée",
  closed: "Clôturée",
  archived: "Archivée",
};

const VARIANTES_STATUT: Record<JobStatus, "secondary" | "success" | "outline" | "warning"> = {
  draft: "secondary",
  active: "success",
  closed: "outline",
  archived: "warning",
};

function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface JobsManagerProps {
  companyId: string;
}

/* Vue recruteur de /jobs : publication, suivi et gestion du cycle de vie des offres. */
export function JobsManager({ companyId }: JobsManagerProps) {
  const searchParams = useSearchParams();
  const [offres, setOffres] = useState<Job[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [edition, setEdition] = useState<Job | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setEdition(null);
      setModaleOuverte(true);
    }
  }, [searchParams]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      const liste = await jobsService.getOffres({ company_id: companyId, limit: 200 });
      const data = liste.length > 0 ? liste : MOCK_OFFRES;
      setOffres(
        [...data].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        )
      );
    } catch {
      setOffres(
        [...MOCK_OFFRES].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        )
      );
    } finally {
      setChargement(false);
    }
  }, [companyId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const changerStatut = async (offre: Job, statut: JobStatus) => {
    setActionEnCours(offre.id);
    try {
      const maj = await jobsService.mettreAJourOffre(offre.id, { status: statut });
      setOffres((prev) => prev.map((o) => (o.id === offre.id ? maj : o)));
    } catch {
      setErreur(true);
    } finally {
      setActionEnCours(null);
    }
  };

  const ouvrirCreation = () => {
    setEdition(null);
    setModaleOuverte(true);
  };

  const ouvrirEdition = (offre: Job) => {
    setEdition(offre);
    setModaleOuverte(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Mes offres"
        description="Publiez et suivez les offres de votre entreprise. Les candidatures sont gérées depuis la fiche de chaque offre."
        actions={
          <Button onClick={ouvrirCreation} className="gap-2">
            <Plus size={16} aria-hidden="true" />
            Publier une offre
          </Button>
        }
      />

      {chargement ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : erreur ? (
        <StatePanel
          tone="error"
          title="Vos offres n'ont pas pu se charger"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      ) : offres.length === 0 ? (
        <StatePanel
          title="Aucune offre pour le moment"
          description="Publiez votre première offre pour recevoir des candidatures."
          actionLabel="Créer ma première offre"
          onAction={ouvrirCreation}
        />
      ) : (
        <ul className="space-y-3">
          {offres.map((offre) => (
            <li
              key={offre.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/jobs/${offre.id}`}
                    className="truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {offre.title}
                  </Link>
                  <Badge variant={VARIANTES_STATUT[offre.status]}>
                    {LIBELLES_STATUT[offre.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {offre.formatted_address ?? "Lieu non précisé"}
                  {offre.is_remote ? " · Télétravail" : ""}
                  {offre.created_at ? ` · créée le ${formaterDate(offre.created_at)}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ouvrirEdition(offre)}
                  disabled={actionEnCours === offre.id}
                >
                  Modifier
                </Button>
                {offre.status !== "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void changerStatut(offre, "active")}
                    disabled={actionEnCours === offre.id}
                  >
                    {actionEnCours === offre.id ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Briefcase size={13} aria-hidden="true" />
                    )}
                    Publier
                  </Button>
                )}
                {offre.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void changerStatut(offre, "closed")}
                    disabled={actionEnCours === offre.id}
                  >
                    Dépublier
                  </Button>
                )}
                <Button variant="ghost" size="sm" render={<Link href={`/jobs/${offre.id}`} />}>
                  Détails
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <JobFormModal
        isOpen={modaleOuverte}
        onClose={() => setModaleOuverte(false)}
        offre={edition}
        onSaved={(offre) => {
          setOffres((prev) => {
            const existe = prev.some((o) => o.id === offre.id);
            return existe
              ? prev.map((o) => (o.id === offre.id ? offre : o))
              : [offre, ...prev];
          });
        }}
      />
    </div>
  );
}
