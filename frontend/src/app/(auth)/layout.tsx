// Layout du groupe auth — centré, sans sidebar ni navigation principale
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg-subtle)] px-4">
      {children}
    </div>
  );
}
