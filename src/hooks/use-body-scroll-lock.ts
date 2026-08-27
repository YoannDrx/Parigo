"use client";

import { useEffect, useRef } from "react";

let activeLocks = 0;
let lockedScrollY = 0;
let previousBodyStyles: Partial<CSSStyleDeclaration> | null = null;

function acquireBodyScrollLock() {
  activeLocks += 1;
  if (activeLocks !== 1 || typeof window === "undefined") return;

  lockedScrollY = window.scrollY;
  previousBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
  };
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.documentElement.dataset.scrollLocked = "true";
}

function releaseBodyScrollLock() {
  if (activeLocks === 0) return;
  activeLocks -= 1;
  if (activeLocks !== 0 || typeof window === "undefined") return;

  const styles = previousBodyStyles;
  document.body.style.overflow = styles?.overflow ?? "";
  document.body.style.position = styles?.position ?? "";
  document.body.style.top = styles?.top ?? "";
  document.body.style.left = styles?.left ?? "";
  document.body.style.right = styles?.right ?? "";
  document.body.style.width = styles?.width ?? "";
  delete document.documentElement.dataset.scrollLocked;
  window.scrollTo({ top: lockedScrollY, behavior: "instant" });
  previousBodyStyles = null;
}

/**
 * A route transition must snapshot the real document scroll position, not the
 * temporary `0` exposed while the body is fixed. Release synchronously before
 * calling router.push so browser back restoration records the right offset.
 */
export function releaseBodyScrollLockBeforeNavigation() {
  const scrollY = activeLocks > 0 ? lockedScrollY : window.scrollY;
  releaseBodyScrollLock();
  return scrollY;
}

export function useBodyScrollLock(active: boolean) {
  const ownsLock = useRef(false);

  useEffect(() => {
    if (active && !ownsLock.current) {
      acquireBodyScrollLock();
      ownsLock.current = true;
    } else if (!active && ownsLock.current) {
      releaseBodyScrollLock();
      ownsLock.current = false;
    }

    return () => {
      if (!ownsLock.current) return;
      releaseBodyScrollLock();
      ownsLock.current = false;
    };
  }, [active]);
}
