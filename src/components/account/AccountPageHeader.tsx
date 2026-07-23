"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface AccountPageHeaderProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AccountPageHeader({ icon: Icon, eyebrow, title, description, actions }: AccountPageHeaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? undefined : { opacity: .72, y: 16 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: .56, ease: [0.22, 1, 0.36, 1] }}
      className="account-page__header grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="account-page__mark mt-1" aria-hidden="true">
          <Icon size={23} />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-[var(--signal-strong)]">{eyebrow}</p>
          <h2 className="mt-3 break-words font-[var(--font-editorial)] text-4xl font-semibold tracking-[-.05em] sm:text-5xl md:text-6xl">{title}</h2>
          {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      {actions && <div className="account-page__actions flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </motion.header>
  );
}
