import type { Metadata } from "next";
import { ComposerAuditDashboard } from "@/components/admin/ComposerAuditDashboard";
import { getParigoComposerAudit } from "@/lib/harvest/composer-audit-inventory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit des compositeurs",
  description: "Dashboard interne Parigo de contrôle des crédits compositeurs et ayants droit Harvest.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function AdminComposersPage() {
  const data = await getParigoComposerAudit();
  return <ComposerAuditDashboard data={data} />;
}
