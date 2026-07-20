"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export default function RegisterPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
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
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de l'inscription" : "An error occurred while creating the account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg py-8"
    >
      <Card padding="lg" className="border-[var(--line)] bg-[var(--surface)] shadow-none">
        <div className="mb-10">
          <p className="eyebrow mb-5 text-[var(--color-primary-dark)]">{t("account.eyebrow")}</p>
          <h1 className="mb-3 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">
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
              htmlFor="name"
              className="block text-sm font-medium text-[var(--color-black)] mb-2"
            >
              {t("auth.name")}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
              <Input
                id="name"
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
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-black)] mb-2"
            >
              {t("auth.email")}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
              <Input
                id="email"
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
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-black)] mb-2"
            >
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
              <Input
                id="password"
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
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[var(--color-black)] mb-2"
            >
              {locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
              <Input
                id="confirmPassword"
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
            <Link
              href="/login"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
