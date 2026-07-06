import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Candidate Dashboard | ETP",
  description: "Enterprise Talent Platform Candidate Portal",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground dark flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
