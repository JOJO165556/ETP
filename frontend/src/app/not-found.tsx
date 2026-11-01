import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          ETP
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Compass size={22} aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-medium text-muted-foreground">Erreur 404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Cette page n&apos;existe pas
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Le lien a peut-être changé ou la page a été retirée. Reprenez depuis votre
            espace de travail pour retrouver vos offres et vos candidatures.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button render={<Link href="/overview" />}>Retour à mon espace</Button>
            <Button variant="outline" render={<Link href="/" />}>
              Aller à l&apos;accueil
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
