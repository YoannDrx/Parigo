import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { RevealText } from "@/components/motion";

interface InstitutionalShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function InstitutionalShell({ eyebrow, title, intro, children }: InstitutionalShellProps) {
  return (
    <div className="page-shell">
      <Header />
      <main>
        <header className="border-b border-[var(--line)] bg-[var(--surface)] px-4 pb-20 pt-32 md:px-8 md:pb-28 md:pt-40">
          <div className="mx-auto max-w-[1700px]"><p className="eyebrow mb-7 text-[var(--signal-strong)]">{eyebrow}</p><RevealText as="h1" className="section-title-serif max-w-5xl">{title}</RevealText><p className="mt-9 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)] md:text-xl">{intro}</p></div>
        </header>
        {children}
      </main>
      <Footer />
    </div>
  );
}
