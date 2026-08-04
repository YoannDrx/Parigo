import { redirect } from "next/navigation";

/**
 * The previous public site historically emitted reset links under
 * /change-password/{token}. Keep that public contract working when the
 * parigomusic.com domain moves to this application.
 */
export default async function LegacyFlexChangePasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  redirect(`/reset-password?token=${encodeURIComponent((await params).token)}`);
}
