"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

export function LegalDocument({ sections, updated = "13 juillet 2026" }: { sections: LegalSection[]; updated?: string }) {
  const { locale } = useI18n();
  return (
    <section className="px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1500px] gap-12 md:grid-cols-12">
        <aside className="md:sticky md:top-28 md:col-span-3 md:self-start"><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Dernière mise à jour" : "Last updated"}</p><p className="mt-3 text-sm text-[var(--text-muted)]">{updated}</p></aside>
        <div className="md:col-span-8 md:col-start-5">{sections.map((section, index) => <article key={section.title} className="grid gap-5 border-t border-[var(--line)] py-10 md:grid-cols-[70px_1fr]"><span className="font-mono text-[.62rem] opacity-35">{String(index + 1).padStart(2, "0")}</span><div><h2 className="font-[var(--font-editorial)] text-4xl font-normal tracking-[-.04em] md:text-5xl">{section.title}</h2><div className="legal-copy mt-5 space-y-4 text-base leading-relaxed text-[var(--text-muted)] [&_a]:border-b [&_a]:border-current/30 [&_a]:text-[var(--foreground)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--foreground)]">{section.content}</div></div></article>)}</div>
      </div>
    </section>
  );
}
