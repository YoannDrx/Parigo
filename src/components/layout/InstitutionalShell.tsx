import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MiniPlayer } from "@/components/features";
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
        <header className="grain bg-[var(--surface-inverse)] px-4 py-24 text-[var(--background)] md:px-8 md:py-36">
          <div className="mx-auto max-w-[1700px]"><p className="eyebrow mb-7 text-[var(--signal)]">{eyebrow}</p><RevealText as="h1" className="section-title-serif max-w-6xl">{title}</RevealText><p className="mt-10 max-w-2xl text-lg leading-relaxed opacity-58 md:text-xl">{intro}</p></div>
        </header>
        {children}
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
