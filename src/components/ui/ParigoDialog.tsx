"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParigoDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  tone?: "default" | "danger";
}

export function ParigoDialog({
  open,
  onClose,
  title,
  eyebrow = "Parigo",
  description,
  closeLabel,
  children,
  footer,
  className,
  tone = "default",
}: ParigoDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="parigo-modal-backdrop fixed inset-0 z-[240] grid place-items-center overflow-y-auto bg-[#090d0a]/72 p-3 backdrop-blur-md md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) onClose();
          }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-tone={tone}
            className={cn(
              "parigo-modal my-auto w-full max-w-xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]",
              className,
            )}
            initial={{ opacity: 0, y: 24, scale: .975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: .985 }}
            transition={{ duration: .26, ease: [.22, 1, .36, 1] }}
          >
            <header className="parigo-modal__header relative border-b border-[var(--line)] px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
              <p className={cn("eyebrow", tone === "danger" ? "text-[var(--danger)]" : "text-[var(--signal-strong)]")}>{eyebrow}</p>
              <h2 id={titleId} className="mt-3 pr-14 font-[var(--font-editorial)] text-4xl tracking-[-.05em] sm:text-5xl">{title}</h2>
              {description && <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] sm:right-6 sm:top-6"
                aria-label={closeLabel}
              >
                <X size={17} />
              </button>
            </header>
            {children && <div className="parigo-modal__body px-6 py-6 sm:px-8">{children}</div>}
            {footer && <footer className="parigo-modal__footer flex flex-col-reverse gap-2 border-t border-[var(--line)] px-6 py-5 sm:flex-row sm:justify-end sm:px-8">{footer}</footer>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
