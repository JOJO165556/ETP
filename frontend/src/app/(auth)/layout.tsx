import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-muted/20 text-foreground">
      {/* Halo lumineux d'arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[640px] h-[320px] bg-primary/10 rounded-full blur-3xl dark:bg-primary/15" />
        <div className="absolute bottom-0 right-10 w-[480px] h-[240px] bg-primary/5 rounded-full blur-3xl dark:bg-primary/10" />
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* En-tête classique */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-12">
        <Link href="/" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border">
            <Image
              src="/etp_logo.webp"
              alt="ETP"
              width={32}
              height={32}
              priority
              className="h-7 w-7 rounded-lg object-cover"
            />
          </div>
          <span
            className="text-base font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            ETP
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Carte centrale */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[480px] rounded-2xl border border-border/80 bg-card/95 p-6 shadow-xl shadow-foreground/[0.03] backdrop-blur-md sm:p-9">
          {children}
        </div>
      </main>

      {/* Pied de page */}
      <footer className="relative z-10 flex items-center justify-center px-6 py-4 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ETP. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
