import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/legal", {
  fr: { title: "Mentions légales", description: "Mentions légales et informations relatives à l’éditeur du site Parigo Music." },
  en: { title: "Legal notice", description: "Legal notice and information about the publisher of the Parigo Music website." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
