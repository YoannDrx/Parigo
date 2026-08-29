import type { CSSProperties, ReactNode } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  intro?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  titleVariant?: "display" | "page" | "detail" | "section" | "compact";
}

export function PageHero({
  title,
  intro,
  meta,
  action,
  className,
  titleVariant = "page",
}: PageHeroProps) {
  const longestWordLength = Math.max(...title.trim().split(/\s+/u).map((word) => word.length));
  const fittedTitleSize = longestWordLength >= 15
    ? "clamp(1.75rem, 6.4vw, 7.2rem)"
    : longestWordLength >= 12
      ? "clamp(2.2rem, 6.4vw, 7.2rem)"
      : undefined;
  const titleStyle = fittedTitleSize
    ? { fontSize: fittedTitleSize } as CSSProperties
    : undefined;

  return (
    <header className={cn("page-hero px-[var(--space-page-gutter)] pt-[var(--space-page-top)]", className)}>
      <div className="mx-auto max-w-[1700px]">
        <div className="page-hero__frame parigo-frame relative grid overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] md:grid-cols-12">
          <div className="page-hero__title-panel relative min-w-0 px-6 pb-4 pt-9 sm:px-8 sm:pb-5 sm:pt-11 md:col-span-8 md:py-11 lg:px-12 lg:py-14">
            <SignedTitle
              variant={titleVariant}
              className="page-hero__title max-w-full break-words font-[var(--font-editorial)] font-semibold leading-[.9] tracking-[-.06em] md:max-w-[13ch]"
              style={titleStyle}
            >
              {title}
            </SignedTitle>
          </div>
          {(intro || meta || action) ? (
            <div className="page-hero__aside relative flex min-w-0 flex-col justify-center gap-4 px-6 pb-7 pt-0 md:col-span-4 md:px-8 md:py-9 lg:px-10">
              {intro ? <p className="max-w-xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">{intro}</p> : null}
              {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
              {meta ? <p className="font-mono text-[.58rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{meta}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
