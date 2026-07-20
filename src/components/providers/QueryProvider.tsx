"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthModal } from "@/components/features/AuthModal";
import { MotionConfig } from "framer-motion";
import { ShortlistDrawer } from "@/components/features/ShortlistDrawer";
import { I18nProvider } from "./I18nProvider";
import { ThemeProvider } from "./ThemeProvider";
import { CookieConsent } from "@/components/privacy/CookieConsent";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user" transition={{ duration: 0.32 }}>
            {children}
            <AuthModal />
            <ShortlistDrawer />
            <CookieConsent />
          </MotionConfig>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
