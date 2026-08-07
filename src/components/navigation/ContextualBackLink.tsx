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
