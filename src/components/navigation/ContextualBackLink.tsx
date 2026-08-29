"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
  const [previousPathname, setPreviousPathname] = useState<string | null>(null);

  useEffect(() => {
    const updateHash = () => {
      setLocationHash(window.location.hash);
      setHashReady(true);
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
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
      router.back();
      return;
    }
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
