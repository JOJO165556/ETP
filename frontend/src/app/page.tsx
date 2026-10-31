"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Cpu,
  BarChart3,
  Users,
  User,
  Building2,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* 1. Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-border shadow-sm transition-transform group-hover:scale-105">
              <Image
                src="/etp_logo.webp"
                alt="ETP Logo"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                ETP
              </span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Talent Platform
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#candidats" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pour les Talents
            </a>
            <a href="#recruteurs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Pour les Entreprises
            </a>
            <a href="#matching-ia" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Matching IA
            </a>
            <a href="#securite" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Souveraineté & RGPD
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-xs sm:text-sm">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold text-xs sm:text-sm shadow-sm gap-1.5">
                Inscription gratuite
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
          {/* Subtle background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40 dark:opacity-20"
          >
            <div className="h-[500px] w-[900px] rounded-full bg-gradient-to-tr from-primary/30 to-blue-400/20 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-8"
            >
              <Sparkles size={14} />
              <span>Matching sémantique PostGIS & IA souveraine de recrutement</span>
            </motion.div>

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              La rencontre des <span className="text-primary">meilleurs talents</span> et des équipes exigeantes.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              Fini les tris manuels interminables. ETP combine géolocalisation haute précision, analyse automatique de CV par IA et pipeline collaboratif sécurisé aux normes européennes.
            </motion.p>

            {/* Dual CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register?role=candidate" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-sm font-semibold h-12 px-6 shadow-md shadow-primary/20">
                  <User size={18} />
                  Je suis Candidat &middot; Matcher mon CV
                </Button>
              </Link>
              <Link href="/register?role=recruiter" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-sm font-semibold h-12 px-6 border-border hover:bg-muted/60">
                  <Building2 size={18} />
                  Je suis Recruteur &middot; Découvrir la plateforme
                </Button>
              </Link>
            </motion.div>

            {/* Micro trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                <span>100% Conforme RGPD</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Analyse de CV instantanée</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-500" />
                <span>Calcul des temps de trajet réels</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. Interactive Matching Preview Card */}
        <section id="matching-ia" className="py-12 border-y border-border/40 bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Un scoring d'adéquation en temps réel
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Notre algorithme évalue les compétences clés, l'expérience et la proximité géographique sans biais subjectif.
              </p>
            </div>

            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    94%
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Adéquation Idéale &middot; Développeur Full Stack</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <MapPin size={12} /> À 15 min de transport &middot; Disponible immédiatement
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-semibold">
                  Match IA confirmé
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compétences</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">React, Next.js, FastAPI, PostgreSQL</p>
                  <p className="mt-1 text-xs text-emerald-500">100% de concordance</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rayon géographique</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Rayon de 12 km respecté</p>
                  <p className="mt-1 text-xs text-emerald-500">PostGIS optimisé</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Traitement CV</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Extraction structurée</p>
                  <p className="mt-1 text-xs text-emerald-500">Parsed en 1.8 seconde</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Dual Pathways : Candidats vs Recruteurs */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
              {/* Carte Candidat */}
              <div id="candidats" className="flex flex-col justify-between rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="space-y-6">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Pour les Talents</span>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                      Votre carrière, sans perte de temps
                    </h3>
                  </div>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Dépôt de CV simplifié :</strong> Importez votre document (PDF/Word), vos expériences et compétences sont automatiquement valorisées.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Offres géolocalisées :</strong> Ne postulez qu'aux opportunités dans votre périmètre de transport idéal.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span><strong>Contrôle souverain :</strong> Vos données restent strictement confidentielles, modifiables ou supprimables à tout moment.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-8">
                  <Link href="/register?role=candidate" className="w-full">
                    <Button className="w-full gap-2 h-11 text-sm font-semibold">
                      Créer mon profil candidat
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Carte Recruteur */}
              <div id="recruteurs" className="flex flex-col justify-between rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="space-y-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Pour les Recruteurs</span>
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                      Accélérez vos recrutements avec précision
                    </h3>
                  </div>
                  <ul className="space-y-4 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                      <span><strong>Classement intelligent :</strong> Vos candidatures sont ordonnées par pertinence technique et adéquation réelle.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                      <span><strong>Pipeline collaboratif Kanban :</strong> Suivez chaque étape (Reçue, Entretien, Offre, Recruté) avec toute l'équipe.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
                      <span><strong>Tableau de bord KPIs :</strong> Mesurez les délais de recrutement, taux de conversion et sources de candidats.</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-8">
                  <Link href="/register?role=recruiter" className="w-full">
                    <Button variant="outline" className="w-full gap-2 h-11 text-sm font-semibold border-border hover:bg-muted/60">
                      Ouvrir un espace entreprise
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Sécurité & RGPD */}
        <section id="securite" className="py-16 border-t border-border/40 bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="mx-auto max-w-3xl">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <Lock size={22} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Sécurité certifiée & Hébergement souverain
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                ETP est conçu dès la première ligne de code pour respecter les plus hautes exigences de protection des données : chiffrement complet, tokens sécurisés HttpOnly, et conformité stricte au RGPD.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-border/40 bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6 overflow-hidden rounded-md">
              <Image src="/etp_logo.webp" alt="ETP" fill className="object-cover" />
            </div>
            <span className="text-sm font-semibold tracking-tight">ETP &middot; Enterprise Talent Platform</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ETP. Tous droits réservés. Hébergé de manière souveraine.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Connexion</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
