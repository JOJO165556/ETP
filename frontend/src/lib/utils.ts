import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalise un texte pour une recherche textuelle insensible à la casse et aux accents.
 */
export function normaliserRecherche(texte?: string | null): string {
  if (!texte) return "";
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
