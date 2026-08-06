import type { CSSProperties, ReactNode } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  intro?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHero({
  title,
  intro,
  meta,
  action,
  className,
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
    <header className={cn("page-hero border-b border-[var(--line)] px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-36", className)}>
      <div className="mx-auto max-w-[1700px]">
        <div className="page-hero__frame parigo-frame relative grid overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] md:grid-cols-12">
          <div className="page-hero__title-panel relative min-w-0 px-6 py-9 sm:px-8 sm:py-11 md:col-span-8 lg:px-12 lg:py-14">
            <SignedTitle
              className="page-hero__title max-w-full break-words font-[var(--font-editorial)] font-semibold leading-[.9] tracking-[-.06em] md:max-w-[13ch]"
              style={titleStyle}
            >
              {title}
            </SignedTitle>
          </div>
          {(intro || meta || action) ? (
            <div className="page-hero__aside relative flex min-w-0 flex-col justify-center gap-5 border-t border-[var(--line)] px-6 py-7 md:col-span-4 md:border-l md:border-t-0 md:px-8 lg:px-10">
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
