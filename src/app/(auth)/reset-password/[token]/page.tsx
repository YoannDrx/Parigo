import { redirect } from "next/navigation";

export default async function LegacyResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  redirect(`/reset-password?token=${encodeURIComponent((await params).token)}`);
}
