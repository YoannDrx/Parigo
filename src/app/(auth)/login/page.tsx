"use client";

import { LoginForm } from "@/components/features/LoginForm";
import { Card } from "@/components/ui/Card";
import { useSearchParams } from "next/navigation";
import { safeInternalPath } from "@/lib/locale";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get("next"));
  return (
    <div className="w-full max-w-lg animate-[fade-in_.3s_ease-out_both]">
      <Card hover={false} padding="lg" className="border-[var(--line)] bg-[var(--surface)] shadow-none">
        <LoginForm nextPath={nextPath} />
      </Card>
    </div>
  );
}
