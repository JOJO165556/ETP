import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default function OverviewPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
        Vue d&apos;ensemble
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        // Dashboard overview à implémenter
      </p>
    </div>
  );
}
