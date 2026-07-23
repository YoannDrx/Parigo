import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/terms", {
  fr: { title: "Conditions générales", description: "Conditions d’utilisation du catalogue, des comptes et des services proposés par Parigo Music." },
  en: { title: "Terms and conditions", description: "Terms governing the Parigo Music catalogue, accounts and services." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
