"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AnchoredPopoverProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
  className?: string;
  width?: number;
  anchorContainerSelector?: string;
  mobileSheet?: boolean;
}

interface Position {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export function AnchoredPopover({
  id,
  open,
  onClose,
  anchorRef,
  label,
  children,
  className,
  width = 288,
  anchorContainerSelector,
  mobileSheet = false,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const gutter = 12;
    const mobilePresentation = mobileSheet && window.matchMedia("(max-width: 767px)").matches;
    if (mobilePresentation) {
      setPosition({ left: gutter, top: 86, width: window.innerWidth - gutter * 2, maxHeight: window.innerHeight - 98 });
      return;
    }
    const gap = 8;
    const anchorContainer = anchorContainerSelector
      ? anchor.closest<HTMLElement>(anchorContainerSelector) ?? anchor
      : anchor;
    const anchorBounds = anchorContainer.getBoundingClientRect();
    const resolvedWidth = Math.min(
      anchorContainerSelector ? anchorBounds.width : width,
      window.innerWidth - gutter * 2,
    );
    const popoverHeight = Math.min(popover.offsetHeight, window.innerHeight - gutter * 2);
    const spaceAbove = anchorBounds.top - gutter;
    const spaceBelow = window.innerHeight - anchorBounds.bottom - gutter;
    const placeAbove = spaceAbove >= popoverHeight + gap || spaceAbove > spaceBelow;
    const top = placeAbove
      ? Math.max(gutter, anchorBounds.top - popoverHeight - gap)
      : Math.min(window.innerHeight - popoverHeight - gutter, anchorBounds.bottom + gap);
    const left = anchorContainerSelector
      ? Math.min(Math.max(gutter, anchorBounds.left), window.innerWidth - resolvedWidth - gutter)
      : Math.min(
        Math.max(gutter, anchorBounds.right - resolvedWidth),
        window.innerWidth - resolvedWidth - gutter,
      );

    setPosition({ left, top, width: resolvedWidth, maxHeight: window.innerHeight - gutter * 2 });
  }, [anchorContainerSelector, anchorRef, mobileSheet, width]);

  useLayoutEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      popoverRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !popoverRef.current?.contains(target)) onClose();
    };
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(popoverRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", handleKeyboard);
    };
  }, [anchorRef, onClose, open, updatePosition]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <><button type="button" aria-label={label} onClick={onClose} className={cn("fixed inset-0 z-[205] bg-black/28 backdrop-blur-[2px]", !mobileSheet && "hidden", "md:hidden")} />
    <div
      id={id}
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
      className={cn("parigo-popover fixed z-[210] overflow-y-auto overscroll-contain border border-[var(--line-strong)] bg-[var(--surface)] p-2 text-[var(--foreground)]", mobileSheet && "max-md:bottom-3 max-md:!top-[86px] max-md:rounded-[var(--parigo-corner-lg)_var(--parigo-turn-lg)]", className)}
    >
      {children}
    </div></>,
    document.body,
  );
}
