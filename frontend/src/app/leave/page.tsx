import type { Metadata } from "next";

import { LeaveClient } from "./leave-client";

export const metadata: Metadata = {
  title: "Vous quittez ETP",
  description: "Confirmation avant d'ouvrir un site externe.",
  robots: { index: false, follow: false },
};

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string | string[] }>;
}) {
  const params = await searchParams;
  const brut = params.to;
  const cible = Array.isArray(brut) ? (brut[0] ?? null) : (brut ?? null);

  return <LeaveClient cible={cible} />;
}
