interface CatalogHeroProps {
  eyebrow: string;
  title: string;
  intro: string;
  meta?: string;
}

export function CatalogHero({ eyebrow, title, intro, meta }: CatalogHeroProps) {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)] px-4 pb-20 pt-32 md:px-8 md:pb-28 md:pt-40">
      <div className="mx-auto grid max-w-[1700px] gap-10 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{eyebrow}</p>
          <h1 className="section-title-serif max-w-[14ch] overflow-visible pb-[.12em] pr-[.08em] leading-[.98]">{title}</h1>
        </div>
        <div className="flex flex-col justify-end md:col-span-3 md:col-start-10">
          <p className="text-lg leading-relaxed text-[var(--text-muted)]">{intro}</p>
          {meta && <p className="mt-6 font-mono text-[.66rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{meta}</p>}
        </div>
      </div>
    </header>
  );
}
