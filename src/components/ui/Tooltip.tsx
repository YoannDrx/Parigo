"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom";

export function Tooltip({
  label,
  children,
  side = "top",
  delay = 420,
  className,
}: {
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  delay?: number;
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const updatePosition = useCallback(() => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition({
      left: bounds.left + bounds.width / 2,
      top: side === "top" ? bounds.top - 9 : bounds.bottom + 9,
    });
  }, [side]);

  const show = (immediate = false) => {
    clearTimer();
    updatePosition();
    timeoutRef.current = setTimeout(() => setVisible(true), immediate ? 0 : delay);
  };

  const hide = () => {
    clearTimer();
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const update = () => updatePosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [updatePosition, visible]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <span
      ref={triggerRef}
      className={cn("inline-flex", className)}
      onPointerEnter={() => show()}
      onPointerLeave={hide}
      onFocusCapture={() => show(true)}
      onBlurCapture={hide}
      aria-describedby={visible ? id : undefined}
    >
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <span
          id={id}
          role="tooltip"
          style={{ left: position.left, top: position.top }}
          className={cn(
            "pointer-events-none fixed z-[220] max-w-64 -translate-x-1/2 rounded-[var(--parigo-corner-sm)] rounded-tr-[var(--parigo-turn-md)] rounded-bl-[var(--parigo-turn-md)] border border-white/12 bg-[#101410]/96 px-2.5 py-1.5 text-center font-mono text-[.56rem] font-semibold uppercase leading-tight tracking-[.1em] text-white shadow-[0_12px_38px_rgba(0,0,0,.28)] backdrop-blur-xl",
            side === "top" ? "-translate-y-full" : "translate-y-0",
          )}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
