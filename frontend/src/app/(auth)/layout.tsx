import Image from "next/image";
import { Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  "IA de matching qui classe les talents par adéquation réelle",
  "Offres géolocalisées avec recherche par rayon de trajet",
  "Un pipeline que toute l'équipe peut piloter ensemble",
];


export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1d40d9] p-10 text-white lg:flex lg:w-[46%] xl:w-[44%]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <Image
            src="/etp_logo.webp"
            alt="ETP"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
          />
          <span className="text-base font-semibold tracking-wide">ETP</span>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-[2.15rem] leading-tight font-bold tracking-tight">
            Là où les meilleures équipes et les meilleurs talents se rencontrent enfin.
          </h2>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check size={11} strokeWidth={2.5} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold tracking-wider text-white/90 uppercase">
              Standard d'ingénierie & Conformité
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Traitement confidentiel des données, chiffrement de bout en bout et hébergement souverain certifié RGPD.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} Enterprise Talent Platform
        </p>
      </div>

      <div className="bg-background relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
