"use client";

import { useCallback, useState } from "react";

export interface PositionLocale {
  latitude: number;
  longitude: number;
}

export interface GeolocalisationState {
  position: PositionLocale | null;
  enCours: boolean;
  erreur: string | null;
  demander: () => void;
}

/*
 * Récupère la localisation du navigateur en demandant le consentement.
 * La demande est déclenchée par le bouton (pas au chargement) pour respecter la confidentialité.
 */
export function useGeolocalisation(
  apresLocalisation?: (position: PositionLocale) => void
): GeolocalisationState {
  const [position, setPosition] = useState<PositionLocale | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const demander = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setErreur("La localisation n'est pas prise en charge par ce navigateur.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nouvellePosition: PositionLocale = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setPosition(nouvellePosition);
        setEnCours(false);
        apresLocalisation?.(nouvellePosition);
      },
      () => {
        setErreur("Autorisation de localisation refusée.");
        setEnCours(false);
      },
      { timeout: 10000 }
    );
  }, [apresLocalisation]);

  return { position, enCours, erreur, demander };
}