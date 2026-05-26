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

function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
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
        setError(result.error.message || "Une erreur est survenue");
      } else {
        close();
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-black)] mb-2">
          Connexion
        </h1>
        <p className="text-[var(--color-gray-600)]">
          Accédez à votre espace Parigo
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
            Email
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
              Mot de passe
            </label>
            <button
              type="button"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Mot de passe oublié ?
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
              Connexion...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-gray-600)]">
          Pas encore de compte ?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            S&apos;inscrire
          </button>
        </p>
      </div>
    </>
  );
}

function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter();
  const close = useAuthModalStore((s) => s.close);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: "Au moins 8 caractères", met: password.length >= 8 },
    { label: "Au moins une majuscule", met: /[A-Z]/.test(password) },
    { label: "Au moins un chiffre", met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (!passwordRequirements.every((req) => req.met)) {
      setError("Le mot de passe ne respecte pas tous les critères");
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
        setError(result.error.message || "Une erreur est survenue");
      } else {
        close();
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-black)] mb-2">
          Créer un compte
        </h1>
        <p className="text-[var(--color-gray-600)]">
          Rejoignez la communauté Parigo
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
            Nom complet
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-gray-400)]" />
            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
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
            Email
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
            Mot de passe
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
            Confirmer le mot de passe
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
              Les mots de passe ne correspondent pas
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
              Inscription...
            </>
          ) : (
            "S'inscrire"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-gray-600)]">
          Déjà un compte ?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Se connecter
          </button>
        </p>
      </div>
    </>
  );
}

export function AuthModal() {
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
            <Card padding="lg" className="bg-white relative">
              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--color-gray-100)] transition-colors"
                aria-label="Fermer"
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
