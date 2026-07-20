"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Calendar, Edit2, Check, X, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";

export default function AccountPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const user = session?.user;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setIsEditing(false);
        // Refresh session
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em] md:text-6xl">
          {t("account.profile")}
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          {locale === "fr" ? "Gérez vos informations personnelles." : "Manage your personal information."}
        </p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-24 h-24 rounded-full border-4 border-[var(--color-black)] object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-[var(--color-primary)] rounded-full border-4 border-[var(--color-black)] flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div className="flex items-center gap-3">
              <User size={20} className="text-[var(--color-gray-400)]" />
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-[var(--color-black)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    placeholder={t("auth.name")}
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 bg-green-500 text-white rounded-[var(--radius-sm)] hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.name || "");
                    }}
                    className="p-2 bg-[var(--color-gray-200)] text-[var(--color-gray-600)] rounded-[var(--radius-sm)] hover:bg-[var(--color-gray-300)] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-semibold text-[var(--color-black)]">
                    {user.name || (locale === "fr" ? "Non renseigné" : "Not provided")}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 text-[var(--color-gray-400)] hover:text-[var(--color-black)] transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-[var(--color-gray-400)]" />
              <span className="text-[var(--color-gray-600)]">{user.email}</span>
            </div>

            {/* Member since */}
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-[var(--color-gray-400)]" />
              <span className="text-[var(--color-gray-600)]">
                {locale === "fr" ? "Membre depuis" : "Member since"}{" "}
                {new Date(user.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 border-l border-t border-[var(--line)] md:grid-cols-4">
        {[
          { label: t("account.favorites"), href: "/account/favorites" },
          { label: t("account.playlists"), href: "/account/playlists" },
          { label: t("account.history"), href: "/account/history" },
          { label: t("account.downloads"), href: "/account/downloads" },
        ].map((stat) => (
          <motion.a
            key={stat.label}
            href={stat.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group min-h-36 border-b border-r border-[var(--line)] p-5 transition hover:bg-[var(--surface-soft)]"
          >
            <p className="font-[var(--font-editorial)] text-3xl font-normal tracking-[-.04em] transition group-hover:italic group-hover:text-[var(--color-primary-dark)]">{stat.label}</p>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
