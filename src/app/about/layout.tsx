import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/about", {
  fr: { title: "À propos", description: "Découvrez Parigo Music, son exigence éditoriale et son accompagnement des professionnels de l’image." },
  en: { title: "About", description: "Discover Parigo Music, its editorial standards and its support for moving-image professionals." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
