"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AuthSwitcher } from "@/components/features/AuthSwitcher";
import { useI18n } from "@/components/providers/I18nProvider";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useParigoModalMotion } from "@/hooks/use-parigo-modal-motion";
import { useAuthModalStore } from "@/stores/auth-modal-store";

export function AuthModal() {
  const { t } = useI18n();
  const { isOpen, view, close, setView } = useAuthModalStore();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const modalMotion = useParigoModalMotion();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <motion.div data-testid="auth-modal-backdrop" aria-hidden="true" className="parigo-modal-backdrop absolute inset-0 cursor-default" onPointerDown={close} {...modalMotion.backdrop} />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={view === "login" ? "auth-login-title" : "auth-register-title"}
            className="relative h-[min(900px,96dvh)] w-full max-w-[1180px]"
            {...modalMotion.dialog}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-current/20 bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] shadow-lg backdrop-blur-xl transition hover:rotate-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
              aria-label={t("common.close")}
            >
              <X aria-hidden="true" size={19} />
            </button>
            <AuthSwitcher
              variant="modal"
              view={view}
              onViewChange={setView}
              onForgot={() => { close(); router.push("/forgot-password"); }}
              onLoginSuccess={() => { close(); router.refresh(); }}
              onRegisterSuccess={(email, verificationEmailSent) => {
                close();
                router.push(`/register/success?email=${encodeURIComponent(email)}&sent=${verificationEmailSent ? "1" : "0"}`);
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
