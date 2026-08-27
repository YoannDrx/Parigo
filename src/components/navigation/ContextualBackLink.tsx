"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const currentPathnameRef = useRef(normalizePathname(pathname));
  const [previousPathname, setPreviousPathname] = useState<string | null>(null);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const storageKey = () => `parigo:scroll:${normalizePathname(window.location.pathname)}`;
    const rememberScroll = () => {
      if (document.documentElement.dataset.scrollLocked === "true") return;
      window.sessionStorage.setItem(storageKey(), String(window.scrollY));
    };
    const restoreHistoryScroll = () => {
      const nextPathname = normalizePathname(window.location.pathname);
      const storedTarget = window.sessionStorage.getItem(`parigo:scroll:${nextPathname}`);
      if (storedTarget === null) return;
      const target = Number(storedTarget);
      if (!Number.isFinite(target)) return;
      let attempts = 0;
      let cancelled = false;
      const cancelEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
      const removeCancellationListeners = () => {
        for (const eventName of cancelEvents) {
          window.removeEventListener(eventName, cancelForUserInput);
        }
      };
      const cancelForUserInput = () => {
        cancelled = true;
        removeCancellationListeners();
      };
      for (const eventName of cancelEvents) {
        window.addEventListener(eventName, cancelForUserInput, { once: true, passive: true });
      }
      const restore = () => {
        if (cancelled) return;
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScroll >= target) window.scrollTo({ top: target, behavior: "instant" });
        attempts += 1;
        if (attempts < 40) {
          window.setTimeout(restore, 50);
        } else {
          removeCancellationListeners();
        }
      };
      window.setTimeout(restore, 0);
    };
    window.addEventListener("scroll", rememberScroll, { passive: true });
    window.addEventListener("popstate", restoreHistoryScroll);
    rememberScroll();
    return () => {
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("scroll", rememberScroll);
      window.removeEventListener("popstate", restoreHistoryScroll);
    };
  }, []);

  useEffect(() => {
    const nextPathname = normalizePathname(pathname);
    if (nextPathname === currentPathnameRef.current) return;

    setPreviousPathname(currentPathnameRef.current);
    currentPathnameRef.current = nextPathname;
  }, [pathname]);

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
      router.back();
      return;
    }
    router.push(href);
  }, [href, previousPathname, router]);
}

type ContextualBackLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string };

export function ContextualBackLink({ href, ...props }: ContextualBackLinkProps) {
  const previousPathname = useContext(NavigationHistoryContext);
  const router = useRouter();

  const handleNavigate: LinkProps["onNavigate"] = (event) => {
    if (!previousPathname) return;

    event.preventDefault();
    router.back();
  };

  return <Link {...props} href={href} onNavigate={handleNavigate} />;
}
