"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { cn } from "@/lib/utils";

interface PasswordRecoveryCardProps {
  activeStep: 0 | 1 | 2;
  children: ReactNode;
  eyebrow: string;
  footer?: ReactNode;
  icon: LucideIcon;
  intro: string;
  title: string;
}

export function PasswordRecoveryCard({ activeStep, children, eyebrow, footer, icon: Icon, intro, title }: PasswordRecoveryCardProps) {
  const { locale } = useI18n();
  const steps = locale === "fr"
    ? ["Votre e-mail", "Vérification", "Nouvel accès"]
    : ["Your email", "Verification", "New access"];

  return (
    <section
      data-testid="password-recovery-card"
      aria-labelledby="password-recovery-title"
      className="parigo-frame mx-auto w-full max-w-[650px] border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-[0_26px_80px_color-mix(in_srgb,var(--foreground)_10%,transparent)] sm:p-9 lg:p-10"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-[var(--signal-strong)]">{eyebrow}</p>
          <SignedTitle id="password-recovery-title" variant="compact" className="mt-5 max-w-[11ch] font-[var(--font-editorial)] font-semibold">
            {title}
          </SignedTitle>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--signal-soft)] text-[var(--signal-strong)] sm:h-14 sm:w-14">
          <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
        </span>
      </div>

      <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-muted)] sm:text-base sm:leading-7">{intro}</p>

      <ol aria-label={locale === "fr" ? "Étapes de récupération du compte" : "Account recovery steps"} className="mt-7 grid grid-cols-3 gap-2 border-y border-[var(--line)] py-4">
        {steps.map((step, index) => {
          const isComplete = index < activeStep;
          const isActive = index === activeStep;
          return (
            <li
              key={step}
              aria-current={isActive ? "step" : undefined}
              className={cn("min-w-0 text-[.62rem] leading-4 text-[var(--text-muted)] sm:text-xs", isActive && "font-semibold text-[var(--foreground)]")}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mb-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--line-strong)] font-mono text-[.55rem]",
                  isComplete && "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-[var(--signal-contrast)]",
                  isActive && "border-[var(--signal-strong)] text-[var(--signal-strong)]",
                )}
              >
                {isComplete ? <Check size={12} strokeWidth={2.5} /> : `0${index + 1}`}
              </span>
              <span className="block truncate sm:whitespace-normal">{step}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-7">{children}</div>
      {footer ? <div className="mt-7 border-t border-[var(--line)] pt-5 text-sm text-[var(--text-muted)]">{footer}</div> : null}
    </section>
  );
}
