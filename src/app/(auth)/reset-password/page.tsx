import { Suspense } from "react";
import { ResetPasswordExperience } from "@/components/features/ResetPasswordExperience";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordExperience />
    </Suspense>
  );
}
