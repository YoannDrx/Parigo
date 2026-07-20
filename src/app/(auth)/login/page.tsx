"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
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
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de la connexion" : "An error occurred while signing in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg"
    >
      <Card padding="lg" className="border-[var(--line)] bg-[var(--surface)] shadow-none">
        <div className="mb-10">
          <p className="eyebrow mb-5 text-[var(--color-primary-dark)]">{t("account.eyebrow")}</p>
          <h1 className="mb-3 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">
            {t("auth.login")}
          </h1>
          <p className="text-[var(--text-muted)]">
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
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-black)]"
              >
                {t("auth.password")}
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                {locale === "fr" ? "Mot de passe oublié ?" : "Forgot password?"}
              </Link>
            </div>
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
            <Link
              href="/register"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              {t("auth.register")}
            </Link>
          </p>
        </div>
      </Card>
    </motion.div>
  );
}
