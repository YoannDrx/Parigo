import { redirect } from "next/navigation";

export default async function LegacyVerifyPage({ params }: { params: Promise<{ token: string }> }) {
  redirect(`/verify?token=${encodeURIComponent((await params).token)}`);
}
