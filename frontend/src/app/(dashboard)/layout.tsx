import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Espace de travail",
  description: "Gérez vos offres, candidats et candidatures depuis un seul espace.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
