"use client";

import { forwardRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MobileFilterSheetProps {
  title: string;
  ariaLabel: string;
  closeLabel: string;
  actionLabel: string;
  children: ReactNode;
  onClose: () => void;
}

export const MobileFilterSheet = forwardRef<HTMLDivElement, MobileFilterSheetProps>(function MobileFilterSheet({
  title,
  ariaLabel,
  closeLabel,
  actionLabel,
  children,
  onClose,
}, ref) {
  return (
    <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-label={closeLabel} />
      <div ref={ref} className="mobile-filter-sheet parigo-drawer parigo-drawer--bottom absolute inset-x-0 bottom-0 flex h-[calc(100dvh-8px)] animate-[fade-in_.3s_ease-out_both] flex-col bg-[var(--background)]">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center border border-[var(--line)]" aria-label={closeLabel}><X size={17} /></button>
        </div>
        <div className="relative z-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">{children}</div>
        <div className="relative z-20 shrink-0 border-t border-[var(--line)] bg-[var(--background)] p-3">
          <Button className="w-full" onClick={onClose}>{actionLabel}</Button>
        </div>
      </div>
    </div>
  );
});
