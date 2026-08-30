"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { releaseBodyScrollLockBeforeNavigation } from "@/hooks/use-body-scroll-lock";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

const NavigationHistoryContext = createContext<string | null>(null);

function normalizePathname(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function routePathname(href: string) {
  return normalizePathname(new URL(href, "https://parigo.local").pathname);
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locationHash, setLocationHash] = useState("");
  const [hashReady, setHashReady] = useState(false);
  const currentLocation = `${normalizePathname(pathname)}${searchParams.size ? `?${searchParams.toString()}` : ""}${locationHash}`;
  const currentLocationRef = useRef<string | null>(null);
  const scrollPositionsRef = useRef(new Map<string, number>());
  const restoringPopstateRef = useRef(false);
  const restoreFrameRef = useRef<number | null>(null);
  const [previousPathname, setPreviousPathname] = useState<string | null>(null);

  useEffect(() => {
    const updateHash = () => {
      setLocationHash(window.location.hash);
      setHashReady(true);
    };
    const rememberCurrentScroll = () => {
      const location = currentLocationRef.current;
      if (!location) return;
      const lockedOffset = document.documentElement.dataset.scrollLocked === "true"
        ? Math.abs(Number.parseFloat(document.body.style.top || "0"))
        : window.scrollY;
      scrollPositionsRef.current.set(location, lockedOffset);
    };
    const markPopstate = () => {
      rememberCurrentScroll();
      restoringPopstateRef.current = true;
      updateHash();
    };
    const rememberBeforeLinkNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin !== window.location.origin || target.href === window.location.href) return;
      rememberCurrentScroll();
    };

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", markPopstate);
    document.addEventListener("click", rememberBeforeLinkNavigation, true);
    return () => {
      if (restoreFrameRef.current !== null) window.cancelAnimationFrame(restoreFrameRef.current);
      window.history.scrollRestoration = previousScrollRestoration;
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", markPopstate);
      document.removeEventListener("click", rememberBeforeLinkNavigation, true);
    };
  }, []);

  useEffect(() => {
    if (!hashReady) return;
    if (currentLocationRef.current === null) {
      currentLocationRef.current = currentLocation;
      return;
    }
    if (currentLocation === currentLocationRef.current) return;

    setPreviousPathname(currentLocationRef.current);
    currentLocationRef.current = currentLocation;
    if (restoringPopstateRef.current) {
      restoringPopstateRef.current = false;
      const targetY = scrollPositionsRef.current.get(currentLocation);
      if (targetY !== undefined) {
        const startedAt = performance.now();
        const restore = () => {
          window.scrollTo({ top: targetY, behavior: "auto" });
          if (Math.abs(window.scrollY - targetY) <= 2 || performance.now() - startedAt > 2_000) {
            restoreFrameRef.current = null;
            return;
          }
          restoreFrameRef.current = window.requestAnimationFrame(restore);
        };
        if (restoreFrameRef.current !== null) window.cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = window.requestAnimationFrame(restore);
      }
    }
  }, [currentLocation, hashReady]);

  return (
    <NavigationHistoryContext.Provider value={previousPathname}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useContextualBack(href: string) {
  const previousPathname = useContext(NavigationHistoryContext);
  const router = useRouter();

  return useCallback(() => {
    if (previousPathname) {
      releaseBodyScrollLockBeforeNavigation();
      router.back();
      return;
    }
    releaseBodyScrollLockBeforeNavigation();
    router.push(href);
  }, [href, previousPathname, router]);
}

type ContextualBackLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string };

export function ContextualBackLink({ href, className, ...props }: ContextualBackLinkProps) {
  const previousPathname = useContext(NavigationHistoryContext);
  const router = useRouter();

  const handleNavigate: LinkProps["onNavigate"] = (event) => {
    if (!previousPathname) return;

    event.preventDefault();
    releaseBodyScrollLockBeforeNavigation();
    router.back();
  };

  return (
    <Link
      {...props}
      href={href}
      onNavigate={handleNavigate}
      className={cn(
        "contextual-back-link inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition-colors",
        className,
      )}
    />
  );
}
