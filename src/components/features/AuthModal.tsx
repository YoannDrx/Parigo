"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useI18n } from "@/components/providers/I18nProvider";

function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const close = useAuthModalStore((s) => s.close);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || (locale === "fr" ? "Une erreur est survenue" : "Something went wrong"));
      } else {
        close();
        router.refresh();
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de la connexion" : "An error occurred while signing in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-black)] mb-2">
          {t("auth.login")}
        </h1>
        <p className="text-[var(--color-gray-600)]">
          {t("auth.loginIntro")}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-[var(--radius-md)] flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-[var(--color-black)] mb-2"
          >
            {t("auth.email")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-[var(--color-black)]"
            >
              {t("auth.password")}
            </label>
            <button
              type="button"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {locale === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t("auth.loggingIn")}
            </>
          ) : (
            t("auth.login")
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-gray-600)]">
          {t("auth.noAccount")} {" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            {t("auth.register")}
          </button>
        </p>
      </div>
    </>
  );
}

function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const close = useAuthModalStore((s) => s.close);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: locale === "fr" ? "Au moins 8 caractères" : "At least 8 characters", met: password.length >= 8 },
    { label: locale === "fr" ? "Au moins une majuscule" : "At least one uppercase letter", met: /[A-Z]/.test(password) },
    { label: locale === "fr" ? "Au moins un chiffre" : "At least one number", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(locale === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match");
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      setError(locale === "fr" ? "Le mot de passe ne respecte pas tous les critères" : "The password does not meet all requirements");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || (locale === "fr" ? "Une erreur est survenue" : "Something went wrong"));
      } else {
        close();
        router.refresh();
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de l'inscription" : "An error occurred while creating the account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-black)] mb-2">
          {t("auth.register")}
        </h1>
        <p className="text-[var(--color-gray-600)]">
          {t("auth.registerIntro")}
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-[var(--radius-md)] flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="register-name"
            className="block text-sm font-medium text-[var(--color-black)] mb-2"
          >
            {t("auth.name")}
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.name")}
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="block text-sm font-medium text-[var(--color-black)] mb-2"
          >
            {t("auth.email")}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="block text-sm font-medium text-[var(--color-black)] mb-2"
          >
            {t("auth.password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 space-y-1"
            >
              {passwordRequirements.map((req) => (
                <div
                  key={req.label}
                  className="flex items-center gap-2 text-xs"
                >
                  {req.met ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--color-gray-300)]" />
                  )}
                  <span
                    className={
                      req.met
                        ? "text-green-600"
                        : "text-[var(--color-gray-500)]"
                    }
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        <div>
          <label
            htmlFor="register-confirmPassword"
            className="block text-sm font-medium text-[var(--color-black)] mb-2"
          >
            {locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="register-confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-500">
              {locale === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match"}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t("auth.registering")}
            </>
          ) : (
            t("auth.register")
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-gray-600)]">
          {t("auth.hasAccount")} {" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            {t("auth.login")}
          </button>
        </p>
      </div>
    </>
  );
}

export function AuthModal() {
  const { t } = useI18n();
  const { isOpen, view, close, setView } = useAuthModalStore();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={close}
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md"
          >
            <Card padding="lg" className="relative border-[var(--line)] bg-[var(--surface)] shadow-[var(--theme-shadow)]">
              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-gray-100)] transition-colors"
                aria-label={t("common.close")}
              >
                <X className="w-5 h-5 text-[var(--color-gray-600)]" />
              </button>

              <AnimatePresence mode="wait">
                {view === "login" ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LoginForm onSwitchToRegister={() => setView("register")} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RegisterForm onSwitchToLogin={() => setView("login")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
