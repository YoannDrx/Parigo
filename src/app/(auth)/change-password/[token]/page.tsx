import { Suspense } from "react";
import { ResetPasswordExperience } from "@/components/features/ResetPasswordExperience";

export default async function LegacyFlexChangePasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense>
      <ResetPasswordExperience initialToken={(await params).token} mode="change" />
    </Suspense>
  );
}
