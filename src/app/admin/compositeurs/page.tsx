import type { Metadata } from "next";
import { refresh, updateTag } from "next/cache";
import { ComposerAuditDashboard } from "@/components/admin/ComposerAuditDashboard";
import { getParigoComposerAuditSummary } from "@/lib/harvest/composer-audit-inventory";

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

async function refreshComposerAudit() {
  "use server";
  updateTag("admin-composers");
  refresh();
}

export default async function AdminComposersPage() {
  const data = await getParigoComposerAuditSummary();
  return <ComposerAuditDashboard data={data} refreshAction={refreshComposerAudit} />;
}
