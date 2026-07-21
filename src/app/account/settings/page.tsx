"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Lock,
  Bell,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export default function SettingsPage() {
  useSession();
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");

  useEffect(() => {
    void fetch("/api/user/profile", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setSubscribed(Boolean(payload?.data?.profile?.subscribed)))
      .catch(() => undefined);
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
      });

      if (response.ok) {
        setPasswordSuccess(true);
      } else {
        const data = await response.json();
        setPasswordError(data.error?.message || (locale === "fr" ? "Impossible d’envoyer l’e-mail" : "Could not send the email"));
      }
    } catch {
      setPasswordError(locale === "fr" ? "Impossible d’envoyer l’e-mail" : "Could not send the email");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSubscriptionChange = async (next: boolean) => {
    setIsSavingSubscription(true);
    setSubscriptionMessage("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: next }),
      });
      if (!response.ok) throw new Error("subscription update failed");
      setSubscribed(next);
      setSubscriptionMessage(locale === "fr" ? "Préférence enregistrée." : "Preference saved.");
    } catch {
      setSubscriptionMessage(locale === "fr" ? "Impossible d’enregistrer cette préférence." : "Could not save this preference.");
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== (locale === "fr" ? "SUPPRIMER" : "DELETE")) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        await signOut();
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center">
          <Settings size={24} className="text-[var(--color-gray-600)]" />
        </div>
        <div>
          <h1 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
            {t("account.settings")}
          </h1>
          <p className="text-[var(--color-gray-600)]">
            {locale === "fr" ? "Gérez vos préférences et votre sécurité." : "Manage your preferences and security."}
          </p>
        </div>
      </div>

      {/* Change Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--line)] bg-[var(--surface)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Lock size={20} className="text-[var(--color-gray-600)]" />
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Changer le mot de passe" : "Change password"}
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <p className="text-sm leading-6 text-[var(--color-gray-600)]">
            {locale === "fr"
              ? "Parigo sécurise le changement de mot de passe par e-mail. Nous vous enverrons un lien à l’adresse de votre compte."
              : "Parigo secures password changes by email. We will send a reset link to your account address."}
          </p>

          {passwordError && (
            <p className="text-red-500 text-sm">{passwordError}</p>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check size={16} />
              <span>{locale === "fr" ? "E-mail de réinitialisation envoyé" : "Password reset email sent"}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isChangingPassword}
            className="gap-2"
          >
            {isChangingPassword ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {locale === "fr" ? "Envoi…" : "Sending…"}
              </>
            ) : (
              locale === "fr" ? "Envoyer le lien de réinitialisation" : "Send password reset link"
            )}
          </Button>
        </form>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-[var(--line)] bg-[var(--surface)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-[var(--color-gray-600)]" />
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Notifications" : "Notifications"}
          </h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--foreground)]">
              {locale === "fr" ? "Recevoir les nouvelles sorties Parigo" : "Receive Parigo new releases"}
            </span>
            <input
              type="checkbox"
              checked={subscribed}
              disabled={isSavingSubscription}
              onChange={(event) => void handleSubscriptionChange(event.target.checked)}
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>
          {subscriptionMessage && <p className="text-sm text-[var(--color-gray-600)]">{subscriptionMessage}</p>}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-red-50 border-2 border-red-500 rounded-[var(--radius-md)] p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-500" />
          <h2 className="text-xl font-semibold text-red-600">
            {locale === "fr" ? "Zone de danger" : "Danger zone"}
          </h2>
        </div>

        <p className="text-[var(--color-gray-600)] mb-4">
          {locale === "fr" ? "La suppression de votre compte est irréversible. Toutes vos données, playlists et favoris seront définitivement supprimés." : "Deleting your account is irreversible. All data, playlists and favourites will be permanently removed."}
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 border-red-500 hover:bg-red-100"
          >
            <Trash2 size={18} className="mr-2" />
            {locale === "fr" ? "Supprimer mon compte" : "Delete my account"}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              {locale === "fr" ? "Tapez « SUPPRIMER » pour confirmer la suppression de votre compte" : "Type “DELETE” to confirm account deletion"}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={locale === "fr" ? "SUPPRIMER" : "DELETE"}
              className="w-full max-w-xs px-4 py-2.5 border-2 border-red-500 rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
              >
                {locale === "fr" ? "Annuler" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== (locale === "fr" ? "SUPPRIMER" : "DELETE") || isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    {locale === "fr" ? "Suppression…" : "Deleting…"}
                  </>
                ) : (
                  locale === "fr" ? "Confirmer la suppression" : "Confirm deletion"
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
