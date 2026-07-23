import { staticMetadata } from "@/lib/seo-server";
export const generateMetadata = staticMetadata("/licensing", {
  fr: { title: "Licensing musical", description: "Comprenez les droits, usages et tarifs pour licencier une musique Parigo dans votre production audiovisuelle." },
  en: { title: "Music licensing", description: "Understand rights, uses and rates for licensing Parigo music in your audiovisual production." },
});
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
