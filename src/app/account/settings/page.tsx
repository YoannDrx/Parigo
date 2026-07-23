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
import { Button, Switch } from "@/components/ui";
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
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/user/profile", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!controller.signal.aborted) setSubscribed(Boolean(payload?.data?.profile?.subscribed));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSubscription(false);
      });
    return () => controller.abort();
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
    const previous = subscribed;
    setSubscribed(next);
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
      setSubscribed(previous);
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
        className="parigo-panel border border-[var(--line)] bg-[var(--surface)] p-6"
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
        className="parigo-panel border border-[var(--line)] bg-[var(--surface)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-[var(--color-gray-600)]" />
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Notifications" : "Notifications"}
          </h2>
        </div>

        <div className="grid gap-5 border-t border-[var(--line)] pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p id="release-notifications-label" className="font-medium text-[var(--foreground)]">
              {locale === "fr" ? "Recevoir les nouvelles sorties Parigo" : "Receive Parigo new releases"}
            </p>
            <p id="release-notifications-description" className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
              {locale === "fr" ? "Une veille ponctuelle sur les nouveaux albums et les sélections éditoriales." : "Occasional updates about new albums and editorial selections."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(isLoadingSubscription || isSavingSubscription) && <Loader2 size={15} className="animate-spin text-[var(--text-muted)]" aria-hidden="true" />}
            <Switch
              checked={subscribed}
              disabled={isLoadingSubscription || isSavingSubscription}
              onCheckedChange={(next) => void handleSubscriptionChange(next)}
              label={locale === "fr" ? "Recevoir les nouvelles sorties Parigo" : "Receive Parigo new releases"}
              aria-describedby="release-notifications-description"
            />
          </div>
          {subscriptionMessage && <p id="subscription-status" role="status" className="text-sm text-[var(--text-muted)] sm:col-span-2">{subscriptionMessage}</p>}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="parigo-panel relative overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[var(--danger)]" />
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[minmax(0,1fr)_12rem] md:items-start md:px-8 md:py-8">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4 flex items-center gap-2 text-[var(--danger)]"><AlertTriangle size={14} />{locale === "fr" ? "Action irréversible" : "Irreversible action"}</p>
            <h2 className="font-[var(--font-editorial)] text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[.94] tracking-[-.05em] text-[var(--foreground)]">
              {locale === "fr" ? "Supprimer votre espace Parigo." : "Delete your Parigo space."}
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              {locale === "fr" ? "Votre profil, vos playlists et vos favoris seront définitivement supprimés. Prenez le temps de vérifier vos sélections avant de continuer." : "Your profile, playlists and favourites will be permanently removed. Take a moment to review your selections before continuing."}
            </p>
          </div>
          <div className="hidden border-l border-[var(--line)] pl-6 md:block">
            <span className="font-mono text-[3.6rem] leading-none tracking-[-.08em] text-[color-mix(in_srgb,var(--danger)_26%,transparent)]">!</span>
            <p className="mt-3 font-mono text-[.58rem] uppercase leading-5 tracking-[.12em] text-[var(--text-muted)]">{locale === "fr" ? "Aucun retour en arrière" : "No undo available"}</p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <div className="border-t border-[var(--line)] px-6 py-5 md:px-8">
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="group/delete inline-flex min-h-11 items-center gap-3 border-b border-[color-mix(in_srgb,var(--danger)_50%,transparent)] font-mono text-[.63rem] font-semibold uppercase tracking-[.09em] text-[var(--danger)] transition-colors hover:border-[var(--danger)]">
              <Trash2 size={16} />{locale === "fr" ? "Supprimer mon compte" : "Delete my account"}<span aria-hidden="true" className="transition-transform group-hover/delete:translate-x-1">→</span>
            </button>
          </div>
        ) : (
          <div className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface))] px-6 py-6 md:px-8">
            <div className="max-w-xl">
              <p className="text-sm font-medium leading-6 text-[var(--foreground)]">
                {locale === "fr" ? <>Écrivez <strong className="font-mono text-[var(--danger)]">SUPPRIMER</strong> pour confirmer.</> : <>Type <strong className="font-mono text-[var(--danger)]">DELETE</strong> to confirm.</>}
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={locale === "fr" ? "SUPPRIMER" : "DELETE"}
                autoComplete="off"
                className="mt-4 min-h-12 w-full border border-[var(--line-strong)] bg-[var(--surface)] px-4 font-mono text-sm tracking-[.08em] text-[var(--foreground)] outline-none transition focus:border-[var(--danger)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--danger)_14%,transparent)]"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
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
                className="border-[var(--danger)] bg-[var(--danger)] text-white hover:!border-[var(--danger)] hover:!bg-[var(--danger)] hover:!text-white"
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
