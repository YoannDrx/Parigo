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

export default function SettingsPage() {
  const { data: session } = useSession();
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
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères");
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
        setPasswordError(data.error || "Erreur lors du changement de mot de passe");
      }
    } catch (error) {
      setPasswordError("Erreur lors du changement de mot de passe");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") return;

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
          <h1 className="text-3xl font-bold text-[var(--color-black)]">
            Paramètres
          </h1>
          <p className="text-[var(--color-gray-600)]">
            Gérez vos préférences et votre sécurité
          </p>
        </div>
      </div>

      {/* Change Password Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Lock size={20} className="text-[var(--color-gray-600)]" />
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            Changer le mot de passe
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
              Mot de passe actuel
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
              Nouveau mot de passe
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
              Confirmer le nouveau mot de passe
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
              <span>Mot de passe modifié avec succès</span>
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
                Modification...
              </>
            ) : (
              "Modifier le mot de passe"
            )}
          </Button>
        </form>
      </motion.div>

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-[var(--color-gray-600)]" />
          <h2 className="text-xl font-semibold text-[var(--color-black)]">
            Notifications
          </h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              Nouveaux albums des labels suivis
            </span>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              Mises à jour des playlists éditoriales
            </span>
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded accent-[var(--color-primary)]"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[var(--color-black)]">
              Newsletter hebdomadaire
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
            Zone de danger
          </h2>
        </div>

        <p className="text-[var(--color-gray-600)] mb-4">
          La suppression de votre compte est irréversible. Toutes vos données,
          playlists et favoris seront définitivement supprimés.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 border-red-500 hover:bg-red-100"
          >
            <Trash2 size={18} className="mr-2" />
            Supprimer mon compte
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              Tapez "SUPPRIMER" pour confirmer la suppression de votre compte
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
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
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "SUPPRIMER" || isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Suppression...
                  </>
                ) : (
                  "Confirmer la suppression"
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
