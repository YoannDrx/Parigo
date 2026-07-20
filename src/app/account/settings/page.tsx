"use client";

import { useState } from "react";
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

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(locale === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(locale === "fr" ? "Le mot de passe doit contenir au moins 8 caractères" : "The password must contain at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordSuccess(true);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await response.json();
        setPasswordError(data.error || (locale === "fr" ? "Erreur lors du changement de mot de passe" : "Password change failed"));
      }
    } catch {
      setPasswordError(locale === "fr" ? "Erreur lors du changement de mot de passe" : "Password change failed");
    } finally {
      setIsChangingPassword(false);
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
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            {locale === "fr" ? "Changer le mot de passe" : "Change password"}
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              {locale === "fr" ? "Mot de passe actuel" : "Current password"}
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              {locale === "fr" ? "Nouveau mot de passe" : "New password"}
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              {locale === "fr" ? "Confirmer le nouveau mot de passe" : "Confirm new password"}
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              className="w-full px-4 py-2.5 border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              required
            />
          </div>

          {passwordError && (
            <p className="text-red-500 text-sm">{passwordError}</p>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check size={16} />
              <span>{locale === "fr" ? "Mot de passe modifié avec succès" : "Password updated successfully"}</span>
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
                {locale === "fr" ? "Modification…" : "Updating…"}
              </>
            ) : (
              locale === "fr" ? "Modifier le mot de passe" : "Update password"
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
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            {locale === "fr" ? "Notifications" : "Notifications"}
          </h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              {locale === "fr" ? "Nouveaux albums des labels suivis" : "New albums from followed labels"}
            </span>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              {locale === "fr" ? "Mises à jour des playlists éditoriales" : "Editorial playlist updates"}
            </span>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              {locale === "fr" ? "Newsletter hebdomadaire" : "Weekly newsletter"}
            </span>
            <input
              type="checkbox"
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>
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
