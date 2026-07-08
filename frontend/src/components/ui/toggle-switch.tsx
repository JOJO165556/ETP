"use client";

import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  actif: boolean;
  onChange: (actif: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  actif,
  onChange,
  className,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={disabled}
      onClick={() => onChange(!actif)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161b22]",
        actif ? "bg-blue-600" : "bg-slate-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          actif ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}
