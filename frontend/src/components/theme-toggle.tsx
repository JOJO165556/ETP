"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

/* Interrupteur de thème clair/sombre — utilisable partout (sidebar, header, auth...). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, basculer } = useTheme();
  const estSombre = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={basculer}
      aria-label={estSombre ? "Passer en mode clair" : "Passer en mode sombre"}
      title={estSombre ? "Mode clair" : "Mode sombre"}
      className={className}
    >
      {estSombre ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </Button>
  );
}