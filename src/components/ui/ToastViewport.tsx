"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useToastStore, type ToastMessage } from "@/stores/toast-store";

const TOAST_DURATION = 4_000;
const subscribeToClient = () => () => undefined;

function ToastItem({ item }: { item: ToastMessage }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const remainingRef = useRef(TOAST_DURATION);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const symbol = item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "i";

  const stopTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedRef.current));
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current !== null) return;
    startedRef.current = performance.now();
    timerRef.current = window.setTimeout(() => dismiss(item.id), remainingRef.current);
  }, [dismiss, item.id]);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      data-tone={item.tone}
      className="parigo-toast flex min-h-14 items-center gap-3 border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-sm shadow-2xl"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
      onFocusCapture={stopTimer}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) startTimer(); }}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center border border-current font-mono text-[.68rem] font-bold" aria-hidden="true">{symbol}</span>
      <p className="min-w-0 flex-1 leading-5">{item.message}</p>
      <button type="button" onClick={() => dismiss(item.id)} className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--line)] font-mono text-sm" aria-label="Fermer" aria-keyshortcuts="Escape">×</button>
    </div>
  );
}

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div className="parigo-toast-viewport pointer-events-none fixed z-[300] flex w-[min(28rem,calc(100vw-1.5rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
      {items.map((item) => <div key={item.id} className="pointer-events-auto"><ToastItem item={item} /></div>)}
    </div>,
    document.body,
  );
}
