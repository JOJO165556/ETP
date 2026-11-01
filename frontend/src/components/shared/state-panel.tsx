"use client";

import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatePanelProps {
  tone?: "default" | "empty" | "error";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/*
 * État unique pour les listes vides et les erreurs de chargement.
 * Le ton reste sobre : un cadre, une icône discrète, une action claire.
 */
export function StatePanel({
  tone = "empty",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: StatePanelProps) {
  const Icon = tone === "error" ? AlertTriangle : Inbox;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          tone === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-1 gap-2">
          <RotateCcw size={14} aria-hidden="true" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
