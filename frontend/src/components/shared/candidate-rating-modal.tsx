"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CandidateRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, content: string) => Promise<void>;
  candidateName?: string;
  initialRating?: number;
  initialContent?: string;
}

/* Modale d'évaluation recruteur avec sélecteur 1-5 étoiles micro-animé */
export function CandidateRatingModal({
  isOpen,
  onClose,
  onSubmit,
  candidateName,
  initialRating = 0,
  initialContent = "",
}: CandidateRatingModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(rating, content);
      onClose();
      setRating(0);
      setContent("");
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setRating(initialRating);
      setContent(initialContent);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Évaluer le candidat
            </h2>
            {candidateName && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {candidateName}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-[20px] w-[20px]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sélecteur d'étoiles */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Note globale
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = rating >= value;
                const isHovered = hoverRating >= value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isSubmitting}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                      "hover:scale-110 active:scale-95",
                      isSubmitting && "cursor-not-allowed"
                    )}
                  >
                    <Star
                      className={cn(
                        "transition-colors duration-200",
                        (isActive || isHovered)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground">
                {rating === 1 && "Insuffisant"}
                {rating === 2 && "À améliorer"}
                {rating === 3 && "Satisfaisant"}
                {rating === 4 && "Très bon"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium text-foreground">
              Commentaire privé
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Partez vos observations sur ce candidat..."
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ce commentaire n'est visible que par l'équipe de recrutement.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-[16px] w-[16px] animate-spin" />
                  Envoi...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
