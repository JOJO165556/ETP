// Layout du groupe dashboard — structure avec sidebar latérale
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — sera remplacée par <AppSidebar /> */}
      <aside className="w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)]" />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
