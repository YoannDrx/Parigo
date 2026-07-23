import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/rights", {
  fr: { title: "Droits et autorisations", description: "Informations sur les droits d’auteur, les licences et les demandes d’autorisation auprès de Parigo Music." },
  en: { title: "Rights and permissions", description: "Information about copyright, licensing and permission requests at Parigo Music." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
