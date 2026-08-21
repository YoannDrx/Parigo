"use client";

import { useSearchParams } from "next/navigation";
import { AuthSwitcher } from "@/components/features/AuthSwitcher";
import { safeInternalPath } from "@/lib/locale";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get("next"));
  return <AuthSwitcher initialView="login" nextPath={nextPath} />;
}
