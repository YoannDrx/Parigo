"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

export function TrackActionsSheet({
  open,
  onClose,
  returnFocusRef,
  id,
  title,
  subtitle,
  image,
  closeLabel,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  closeLabel: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        window.requestAnimationFrame(() => returnFocusRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open, returnFocusRef]);

  if (!open || typeof document === "undefined") return null;
  const closeAndRestore = () => {
    onClose();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };
  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={`${eyebrow} : ${title}`}>
      <button type="button" className="track-actions-sheet__backdrop absolute inset-0" onClick={closeAndRestore} aria-label={`${closeLabel} — ${eyebrow.toLocaleLowerCase()}`} />
      <section ref={sheetRef} id={id} className="track-actions-sheet absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,46rem)] flex-col overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] shadow-[0_-28px_90px_rgba(0,0,0,.32)]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 py-3">
          {image ? <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[var(--line)]"><Image src={image} alt="" fill sizes="48px" className="object-cover" /></div> : null}
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[var(--signal-strong)]">{eyebrow}</p>
            <h2 id={`${id}-title`} className="mt-1 line-clamp-2 text-base font-semibold leading-5">{title}</h2>
            {subtitle ? <p className="mt-1 truncate font-mono text-[.58rem] text-[var(--text-muted)]">{subtitle}</p> : null}
          </div>
          <button ref={closeRef} type="button" onClick={closeAndRestore} className="grid h-11 w-11 shrink-0 place-items-center border border-[var(--line)]" aria-label={closeLabel}><X size={17} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
