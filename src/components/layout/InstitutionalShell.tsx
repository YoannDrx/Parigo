import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { PageHero } from "./PageHero";

interface InstitutionalShellProps {
  title: string;
  intro: string;
  children: ReactNode;
  showHero?: boolean;
  heroContainerClassName?: string;
  titleVariant?: "display" | "page" | "detail" | "section" | "compact";
}

export function InstitutionalShell({ title, intro, children, showHero = true, heroContainerClassName = "max-w-[1500px]", titleVariant = "page" }: InstitutionalShellProps) {
  return (
    <div className="page-shell overflow-x-clip">
      <Header />
      <main>
        {showHero ? <PageHero title={title} intro={intro} titleVariant={titleVariant} className="institutional-page-hero" containerClassName={heroContainerClassName} /> : null}
        {children}
      </main>
      <Footer />
    </div>
  );
}
