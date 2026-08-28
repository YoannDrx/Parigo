import { Suspense } from "react";
import { ResetPasswordExperience } from "@/components/features/ResetPasswordExperience";

export default async function LegacyResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense>
      <ResetPasswordExperience initialToken={(await params).token} />
    </Suspense>
  );
}
