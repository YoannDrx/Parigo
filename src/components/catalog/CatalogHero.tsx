import { PageHero } from "@/components/layout/PageHero";

interface CatalogHeroProps {
  title: string;
  intro: string;
  containerClassName?: string;
}

export function CatalogHero({ title, intro, containerClassName }: CatalogHeroProps) {
  return <PageHero title={title} intro={intro} containerClassName={containerClassName} insetContainer />;
}
