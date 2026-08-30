import type { CSSProperties, ReactNode } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  intro?: ReactNode;
  action?: ReactNode;
  className?: string;
  containerClassName?: string;
  insetContainer?: boolean;
  titleVariant?: "display" | "page" | "detail" | "section" | "compact";
}

export function PageHero({
  title,
  intro,
  action,
  className,
  containerClassName,
  insetContainer = false,
  titleVariant = "page",
}: PageHeroProps) {
  const longestWordLength = Math.max(...title.trim().split(/\s+/u).map((word) => word.length));
  const fittedTitleSize = longestWordLength >= 15
    ? "clamp(1.75rem, 4.8vw, 5.6rem)"
    : longestWordLength >= 12
      ? "clamp(2.1rem, 4.8vw, 5.6rem)"
      : undefined;
  const titleStyle = fittedTitleSize
    ? { fontSize: fittedTitleSize } as CSSProperties
    : undefined;

  return (
    <header className={cn("page-hero pt-[calc(74px+clamp(2.5rem,4vw,4rem))]", !insetContainer && "px-[var(--space-page-gutter)]", className)}>
      <div className={cn("mx-auto max-w-[1700px]", insetContainer && "px-[var(--space-page-gutter)]", containerClassName)}>
        <div className="page-hero__content relative flex min-w-0 flex-col items-start">
          <SignedTitle
            variant={titleVariant}
            className="page-hero__title max-w-full break-words font-[var(--font-editorial)] font-semibold leading-[.9] tracking-[-.06em] md:max-w-[18ch]"
            style={titleStyle}
          >
            {title}
          </SignedTitle>
          {intro ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:mt-4 sm:text-base sm:leading-7">{intro}</p> : null}
          {action ? <div className="mt-5 flex w-full flex-wrap items-center justify-between gap-3">{action}</div> : null}
        </div>
      </div>
    </header>
  );
}
