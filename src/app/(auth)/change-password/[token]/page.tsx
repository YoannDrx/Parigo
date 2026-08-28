import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ResetPasswordExperience } from "@/components/features/ResetPasswordExperience";

export default async function LegacyFlexChangePasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token === "demo") notFound();

  return (
    <Suspense>
      <ResetPasswordExperience initialToken={token} mode="change" />
    </Suspense>
  );
}
