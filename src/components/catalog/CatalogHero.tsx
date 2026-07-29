import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";

interface CatalogHeroProps {
  title: string;
  intro: string;
  meta?: ReactNode;
}

export function CatalogHero({ title, intro, meta }: CatalogHeroProps) {
  return <PageHero title={title} intro={intro} meta={meta} />;
}
