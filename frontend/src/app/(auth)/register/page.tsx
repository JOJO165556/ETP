import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inscription" };

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">
        Créer un compte
      </h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        // Formulaire d&apos;inscription à implémenter
      </p>
    </div>
  );
}
