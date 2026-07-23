"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AnchoredPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
  className?: string;
  width?: number;
}

interface Position {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export function AnchoredPopover({ open, onClose, anchorRef, label, children, className, width = 288 }: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const gutter = 12;
    const gap = 8;
    const anchorBounds = anchor.getBoundingClientRect();
    const resolvedWidth = Math.min(width, window.innerWidth - gutter * 2);
    const popoverHeight = Math.min(popover.offsetHeight, window.innerHeight - gutter * 2);
    const spaceAbove = anchorBounds.top - gutter;
    const spaceBelow = window.innerHeight - anchorBounds.bottom - gutter;
    const placeAbove = spaceAbove >= popoverHeight + gap || spaceAbove > spaceBelow;
    const top = placeAbove
      ? Math.max(gutter, anchorBounds.top - popoverHeight - gap)
      : Math.min(window.innerHeight - popoverHeight - gutter, anchorBounds.bottom + gap);
    const left = Math.min(
      Math.max(gutter, anchorBounds.right - resolvedWidth),
      window.innerWidth - resolvedWidth - gutter,
    );

    setPosition({ left, top, width: resolvedWidth, maxHeight: window.innerHeight - gutter * 2 });
  }, [anchorRef, width]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !popoverRef.current?.contains(target)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [anchorRef, onClose, open, updatePosition]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={label}
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? 0,
        width: position?.width ?? width,
        maxHeight: position?.maxHeight,
        visibility: position ? "visible" : "hidden",
      }}
      className={cn("fixed z-[210] overflow-y-auto border border-[var(--line-strong)] bg-[var(--surface)] p-2 text-[var(--foreground)] shadow-[var(--shadow-lg)]", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
