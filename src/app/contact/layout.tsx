import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/contact", {
  fr: { title: "Contact et demandes de licence", description: "Contactez Parigo Music pour une recherche musicale, une licence ou un accompagnement éditorial." },
  en: { title: "Contact and licensing enquiries", description: "Contact Parigo Music for music searches, licensing enquiries or editorial support." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
