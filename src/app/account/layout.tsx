import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { readHarvestSession } from "@/lib/harvest/session";
import { getRequestLocale } from "@/lib/locale-server";
import { localizedPath } from "@/lib/locale";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([
    readHarvestSession({ refresh: false, migrateLegacy: false }),
    getRequestLocale(),
  ]);
  if (!session) {
    const login = localizedPath(locale, "/login");
    redirect(`${login}?next=${encodeURIComponent(localizedPath(locale, "/account"))}`);
  }
  return <AccountShell>{children}</AccountShell>;
}
