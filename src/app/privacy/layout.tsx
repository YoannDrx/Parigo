import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/privacy", {
  fr: { title: "Politique de confidentialité", description: "Données traitées, durées de conservation, prestataires et droits des utilisateurs de Parigo Music." },
  en: { title: "Privacy policy", description: "Data processing, retention periods, providers and user rights at Parigo Music." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
