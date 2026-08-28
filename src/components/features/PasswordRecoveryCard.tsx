"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SignedTitle } from "@/components/ui/SignedTitle";

interface PasswordRecoveryCardProps {
  children: ReactNode;
  footer?: ReactNode;
  icon: LucideIcon;
  intro: string;
  title: string;
}

export function PasswordRecoveryCard({ children, footer, icon: Icon, intro, title }: PasswordRecoveryCardProps) {
  return (
    <section
      data-testid="password-recovery-card"
      aria-labelledby="password-recovery-title"
      className="parigo-frame mx-auto w-full max-w-[650px] border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-[0_26px_80px_color-mix(in_srgb,var(--foreground)_10%,transparent)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <SignedTitle id="password-recovery-title" variant="compact" className="max-w-[11ch] font-[var(--font-editorial)] font-semibold">
            {title}
          </SignedTitle>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--signal-soft)] text-[var(--signal-strong)] sm:h-14 sm:w-14">
          <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
        </span>
      </div>

      <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">{intro}</p>
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 border-t border-[var(--line)] pt-4 text-sm text-[var(--text-muted)]">{footer}</div> : null}
    </section>
  );
}
