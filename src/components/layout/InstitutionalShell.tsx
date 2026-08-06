import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageHero } from "./PageHero";

interface InstitutionalShellProps {
  title: string;
  intro: string;
  children: ReactNode;
  showHero?: boolean;
}

export function InstitutionalShell({ title, intro, children, showHero = true }: InstitutionalShellProps) {
  return (
    <div className="page-shell overflow-x-clip">
      <Header />
      <main>
        {showHero ? <PageHero title={title} intro={intro} /> : null}
        {children}
      </main>
      <Footer />
    </div>
  );
}
