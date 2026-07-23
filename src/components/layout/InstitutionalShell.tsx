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
    <div className="page-shell overflow-x-clip">
      <Header />
      <main>
        <header className="institutional-hero border-b border-[var(--line)] px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36">
          <div className="mx-auto max-w-[1700px]">
            <div className="institutional-hero__frame parigo-frame grid gap-10 border border-[var(--line-strong)] bg-[var(--surface)] p-6 md:grid-cols-12 md:p-10 lg:p-14">
              <div className="relative min-w-0 md:col-span-8">
                <p className="eyebrow mb-7 text-[var(--signal-strong)]">{eyebrow}</p>
                <RevealText as="h1" className="section-title-serif max-w-5xl break-words">{title}</RevealText>
              </div>
              <div className="relative flex flex-col justify-between border-t border-[var(--line)] pt-6 md:col-span-3 md:col-start-10 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <p className="max-w-xl text-base leading-7 text-[var(--text-muted)] md:text-lg">{intro}</p>
                <p className="mt-10 font-mono text-[.56rem] uppercase tracking-[.14em] text-[var(--text-muted)]">Parigo Music · Paris · France</p>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
      <Footer />
    </div>
  );
}
