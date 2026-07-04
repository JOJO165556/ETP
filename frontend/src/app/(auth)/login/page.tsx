import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">
        Connexion
      </h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        // Formulaire de connexion à implémenter
      </p>
    </div>
  );
}
