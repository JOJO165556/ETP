import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/* En-tête de page homogène : titre, description, actions alignées à droite. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-center",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
