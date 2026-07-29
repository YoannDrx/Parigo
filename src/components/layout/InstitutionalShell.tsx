import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageHero } from "./PageHero";

interface InstitutionalShellProps {
  title: string;
  intro: string;
  children: ReactNode;
}

export function InstitutionalShell({ title, intro, children }: InstitutionalShellProps) {
  return (
    <div className="page-shell overflow-x-clip">
      <Header />
      <main>
        <PageHero title={title} intro={intro} />
        {children}
      </main>
      <Footer />
    </div>
  );
}
