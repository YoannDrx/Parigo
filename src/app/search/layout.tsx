export const metadata = {
  title: "Recherche",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
