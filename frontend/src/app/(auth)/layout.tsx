import { Check } from "lucide-react";

const FEATURES = [
  "IA de matching qui classe les talents par adéquation réelle",
  "Offres géolocalisées avec recherche par rayon de trajet",
  "Un pipeline que toute l'équipe peut piloter ensemble",
];

const TESTIMONIAL = {
  quote:
    "ETP a réduit notre temps de recrutement d'un tiers. Les scores de matching sont d'une précision impressionnante.",
  author: "Camille R.",
  role: "Head of Talent, Lumen",
};

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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            E
          </div>
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

          <div className="rounded-xl bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-white/90 before:content-['\u201C'] after:content-['\u201D']">
              {TESTIMONIAL.quote}
            </p>
            <p className="mt-3 text-xs font-medium text-white/60">
              {TESTIMONIAL.author} &middot; {TESTIMONIAL.role}
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} Enterprise Talent Platform
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        {children}
      </div>
    </div>
  );
}
