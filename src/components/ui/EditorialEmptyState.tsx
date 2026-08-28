import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EditorialEmptyStateProps {
  image: string;
  imageAlt: string;
  imageClassName?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  headingLevel?: 2 | 3;
  layout?: "split" | "stacked";
  className?: string;
  testId?: string;
}

export function EditorialEmptyState({
  image,
  imageAlt,
  imageClassName,
  title,
  description,
  children,
  headingLevel = 2,
  layout = "split",
  className,
  testId,
}: EditorialEmptyStateProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const stacked = layout === "stacked";

  return (
    <section
      data-testid={testId}
      className={cn(
        "editorial-empty-state parigo-frame overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]",
        stacked ? "grid" : "grid md:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-[var(--surface-soft)]", stacked ? "aspect-[16/10]" : "aspect-[4/3] md:aspect-auto md:min-h-[22rem]")}>
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes={stacked ? "(max-width: 512px) 100vw, 512px" : "(max-width: 768px) 100vw, 50vw"}
          className={cn("object-cover transition-transform duration-700", imageClassName)}
          data-testid={testId ? `${testId}-image` : undefined}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_55%,rgba(20,22,17,.12))]" />
      </div>
      <div className={cn("flex flex-col justify-center", stacked ? "items-center px-5 py-7 text-center" : "items-center px-7 py-10 text-center md:items-start md:px-10 md:text-left lg:px-12")}>
        <Heading className={cn("font-[var(--font-editorial)] font-semibold tracking-[-.04em] text-[var(--foreground)]", stacked ? "text-2xl" : "text-3xl sm:text-4xl")}>{title}</Heading>
        {description ? <div className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{description}</div> : null}
        {children ? <div className={cn("mt-6 flex flex-wrap gap-3", stacked && "justify-center")}>{children}</div> : null}
      </div>
    </section>
  );
}
