import { cn } from "@/lib/utils";

/*
 * Bloc de chargement statique.
 * Volontairement sans animation : un squelette qui pulse attire l'oeil sur une
 * absence de contenu. Une teinte neutre suffit à réserver la place.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-muted-foreground/12", className)}
      {...props}
    />
  );
}

export { Skeleton };
