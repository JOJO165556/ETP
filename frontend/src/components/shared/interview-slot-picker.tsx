"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Check, X, AlertCircle } from "lucide-react";

interface Slot {
  id: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
  conflict?: boolean;
}

interface InterviewSlotPickerProps {
  slots: Slot[];
  selectedSlot?: string;
  onSelect: (slotId: string) => void;
  className?: string;
}

/* Sélecteur de créneaux d'entretien avec détection visuelle des conflits */
export function InterviewSlotPicker({ 
  slots, 
  selectedSlot, 
  onSelect,
  className 
}: InterviewSlotPickerProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-[16px] w-[16px]" />
        <span>Créneaux disponibles</span>
      </div>

      {Object.entries(groupedSlots).map(([date, daySlots]) => (
        <div key={date} className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">{date}</h4>
          <div className="grid gap-2">
            {daySlots.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              const isHovered = hoveredSlot === slot.id;
              const isAvailable = slot.available && !slot.conflict;

              return (
                <button
                  key={slot.id}
                  onClick={() => isAvailable && onSelect(slot.id)}
                  onMouseEnter={() => setHoveredSlot(slot.id)}
                  onMouseLeave={() => setHoveredSlot(null)}
                  disabled={!isAvailable}
                  className={cn(
                    "group relative flex items-center justify-between rounded-lg border p-3 text-left transition-all duration-200",
                    "hover:scale-[1.01] active:scale-[0.98]",
                    !isAvailable && "opacity-50 cursor-not-allowed",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : isAvailable
                        ? "border-border bg-card hover:border-primary/50 hover:bg-secondary"
                        : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Indicateur de statut */}
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isAvailable
                          ? "bg-muted text-muted-foreground group-hover:bg-primary/10"
                          : "bg-destructive/10 text-destructive"
                    )}>
                      {slot.conflict ? (
                        <AlertCircle className="h-[16px] w-[16px]" />
                      ) : isSelected ? (
                        <Check className="h-[16px] w-[16px]" />
                      ) : isAvailable ? (
                        <Clock className="h-[16px] w-[16px]" />
                      ) : (
                        <X className="h-[16px] w-[16px]" />
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {slot.time}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {slot.duration} min
                      </div>
                    </div>
                  </div>

                  {/* Badge de conflit */}
                  {slot.conflict && (
                    <span className="text-xs font-medium text-destructive">
                      Conflit
                    </span>
                  )}

                  {/* Tooltip sur hover */}
                  {isHovered && slot.conflict && (
                    <div className="absolute right-0 top-full mt-2 z-10 w-48 rounded-lg border border-border bg-popover p-2 text-xs text-foreground shadow-lg">
                      Ce créneau chevauche un autre entretien existant.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {slots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-[32px] w-[32px] text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucun créneau disponible pour le moment.
          </p>
        </div>
      )}
    </div>
  );
}
