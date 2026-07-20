import { cn } from "@/lib/utils";

interface ParigoLogoProps {
  className?: string;
}

export function ParigoLogo({ className }: ParigoLogoProps) {
  return (
    <span className={cn("parigo-logo", className)} aria-hidden="true">
      <span className="parigo-logo__corner parigo-logo__corner--top" />
      <span className="parigo-logo__word">PARI</span>
      <span className="parigo-logo__go">GO</span>
      <span className="parigo-logo__corner parigo-logo__corner--bottom" />
    </span>
  );
}
