import { cn } from "@/lib/utils";
import { STATUT_CONFIG, type Statut } from "@/lib/types";

interface StatutBadgeProps {
  statut: Statut;
  className?: string;
  size?: "sm" | "md";
}

export function StatutBadge({
  statut,
  className,
  size = "md",
}: StatutBadgeProps) {
  const config = STATUT_CONFIG[statut];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-0.5 text-xs",
        config.className,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dotColor)}
      />
      {statut}
    </span>
  );
}
