"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export interface LegalSection {
  title: string;
  content: ReactNode;
}

function sectionId(title: string, index: number) {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `legal-${String(index + 1).padStart(2, "0")}-${slug}`;
}

export function LegalDocument({ sections, updated = "13 juillet 2026" }: { sections: LegalSection[]; updated?: string }) {
  const { locale } = useI18n();
  const sectionEntries = useMemo(() => sections.map((section, index) => ({
    ...section,
    id: sectionId(section.title, index),
  })), [sections]);
  const [activeId, setActiveId] = useState(sectionEntries[0]?.id ?? "");
  const mobileContentsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const nodes = sectionEntries.map(({ id }) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) return;

    const updateActiveSection = () => {
      const anchor = window.innerHeight * .36;
      const current = nodes.reduce((candidate, node) => (
        node.getBoundingClientRect().top <= anchor ? node : candidate
      ), nodes[0]);
      setActiveId(current.id);
    };
    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: "-12% 0px -62% 0px",
      threshold: [0, .2, .8],
    });
    nodes.forEach((node) => observer.observe(node));
    const frame = window.requestAnimationFrame(updateActiveSection);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [sectionEntries]);

  const activeSection = sectionEntries.find(({ id }) => id === activeId) ?? sectionEntries[0];
  const contents = (mobile = false) => (
    <nav className={mobile ? "legal-toc-mobile__nav" : "mt-7 border-t border-[var(--line)] pt-5"} aria-label={locale === "fr" ? "Sommaire du document" : "Document contents"}>
      {!mobile && <p className="mb-3 font-mono text-[.56rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{locale === "fr" ? "Dans ce document" : "In this document"}</p>}
      <ol className="grid gap-1">
        {sectionEntries.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeId === section.id ? "location" : undefined}
              data-active={activeId === section.id}
              onClick={() => {
                setActiveId(section.id);
                if (mobileContentsRef.current) mobileContentsRef.current.open = false;
              }}
              className="legal-toc__link group grid min-h-11 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 py-2 text-sm text-[var(--text-muted)]"
            >
              <span className="font-mono text-[.58rem] text-[var(--signal-strong)]">0{index + 1}</span>
              <span className="leading-5">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <section className="bg-[var(--surface-soft)] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-12 lg:gap-12">
        <details ref={mobileContentsRef} className="legal-toc-mobile parigo-frame border border-[var(--line)] bg-[var(--surface)] lg:hidden">
          <summary className="grid min-h-14 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3">
            <span className="min-w-0">
              <span className="block font-mono text-[.54rem] uppercase tracking-[.13em] text-[var(--signal-strong)]">{locale === "fr" ? "Dans ce document" : "In this document"}</span>
              <span className="mt-1 block truncate text-sm font-semibold">{activeSection?.title}</span>
            </span>
            <span className="legal-toc-mobile__chevron" aria-hidden="true">⌄</span>
          </summary>
          <div className="border-t border-[var(--line)] px-4 py-3">{contents(true)}</div>
        </details>
        <aside className="legal-toc parigo-frame hidden max-h-[calc(100svh-var(--sticky-offset)-1.5rem)] overflow-y-auto border border-[var(--line)] bg-[var(--surface)] p-6 lg:sticky lg:top-[var(--sticky-offset)] lg:col-span-3 lg:block lg:self-start">
          <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Dernière mise à jour" : "Last updated"}</p>
          <p className="mt-3 text-sm text-[var(--text-muted)]">{updated}</p>
          {contents()}
        </aside>
        <div className="grid min-w-0 gap-4 lg:col-span-9">
          {sectionEntries.map((section, index) => <article id={section.id} key={section.id} className="legal-section parigo-frame grid scroll-mt-[var(--sticky-offset)] gap-5 border border-[var(--line)] bg-[var(--surface)] p-6 md:grid-cols-[72px_1fr] md:p-8 lg:p-10"><span className="font-mono text-[.62rem] text-[var(--signal-strong)]">0{index + 1}</span><div className="min-w-0"><h2 className="font-[var(--font-editorial)] text-3xl font-normal tracking-[-.04em] sm:text-4xl md:text-5xl">{section.title}</h2><div className="legal-copy mt-5 space-y-4 break-words text-base leading-7 text-[var(--text-muted)] [&_a]:border-b [&_a]:border-current/30 [&_a]:text-[var(--foreground)] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[var(--foreground)]">{section.content}</div></div></article>)}
        </div>
      </div>
    </section>
  );
}
