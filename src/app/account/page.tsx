"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { Button, Input, Select, Tooltip } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { MemberProfile } from "@/types";

type FullProfile = MemberProfile & { image?: string; createdAt?: string };
type EditableProfile = Pick<FullProfile, "firstName" | "lastName" | "company" | "country" | "production" | "subProduction" | "position" | "address1" | "address2" | "suburb" | "state" | "postcode" | "phone" | "website" | "fileFormatId">;

const editableKeys: Array<keyof EditableProfile> = ["firstName", "lastName", "company", "country", "production", "subProduction", "position", "address1", "address2", "suburb", "state", "postcode", "phone", "website", "fileFormatId"];

function editable(profile: FullProfile): EditableProfile {
  return Object.fromEntries(editableKeys.map((key) => [key, profile[key] ?? ""])) as EditableProfile;
}

export default function AccountPage() {
  const { locale, t } = useI18n();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [form, setForm] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/profile", { cache: "no-store" });
      if (!response.ok) throw new Error("profile");
      const payload = await response.json() as { data: { profile: FullProfile } };
      setProfile(payload.data.profile);
      setForm(editable(payload.data.profile));
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadProfile(); }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "profile");
      setProfile(payload.data.profile); setForm(editable(payload.data.profile));
      setMessage(locale === "fr" ? "Profil enregistré." : "Profile saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : (locale === "fr" ? "Enregistrement impossible." : "Could not save.")); }
    finally { setSaving(false); }
  };

  const uploadImage = async (file: File) => {
    setMessage("");
    setImageBusy(true);
    try {
      const prepare = await fetch("/api/user/profile/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, contentType: file.type }) });
      const prepared = await prepare.json();
      if (!prepare.ok) return setMessage(prepared?.error?.message || (locale === "fr" ? "L’envoi de l’image est indisponible." : "Image upload is unavailable."));
      const uploaded = await fetch(prepared.data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) return setMessage(locale === "fr" ? "L’envoi de l’image a échoué." : "Image upload failed.");
      const confirmed = await fetch("/api/user/profile/image", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: prepared.data.fileName }) });
      if (!confirmed.ok) return setMessage(locale === "fr" ? "Parigo n’a pas confirmé l’image." : "Parigo did not confirm the image.");
      await loadProfile();
    } finally {
      setImageBusy(false);
    }
  };

  const removeImage = async () => {
    setMessage("");
    setImageBusy(true);
    try {
      const response = await fetch("/api/user/profile/image", { method: "DELETE" });
      if (response.ok) await loadProfile();
      else setMessage(locale === "fr" ? "Impossible de supprimer la photo." : "Could not remove the photo.");
    } finally {
      setImageBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!profile || !form) return <p>{locale === "fr" ? "Profil Parigo indisponible." : "Parigo profile unavailable."}</p>;

  const statusLabel = profile.status === "active" ? (locale === "fr" ? "Actif" : "Active") : profile.status || (locale === "fr" ? "Non renseigné" : "Not provided");
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() || profile.email[0]?.toUpperCase();
  const fields: Array<{ key: keyof EditableProfile; fr: string; en: string; type?: string }> = [
    { key: "firstName", fr: "Prénom", en: "First name" }, { key: "lastName", fr: "Nom", en: "Last name" },
    { key: "company", fr: "Société", en: "Company" }, { key: "production", fr: "Production", en: "Production" },
    { key: "subProduction", fr: "Sous-production", en: "Sub-production" }, { key: "position", fr: "Poste", en: "Position" },
    { key: "country", fr: "Pays", en: "Country" }, { key: "address1", fr: "Adresse", en: "Address" },
    { key: "address2", fr: "Complément", en: "Address line 2" }, { key: "suburb", fr: "Ville", en: "City" },
    { key: "state", fr: "État / région", en: "State / region" }, { key: "postcode", fr: "Code postal", en: "Postcode" },
    { key: "phone", fr: "Téléphone", en: "Phone", type: "tel" }, { key: "website", fr: "Site web", en: "Website", type: "url" },
  ];

  return <div className="space-y-8">
    <div><p className="eyebrow mb-4">{locale === "fr" ? "Membre Parigo" : "Parigo member"}</p><h1 className="font-[var(--font-editorial)] text-5xl tracking-[-.05em] md:text-6xl">{t("account.profile")}</h1><p className="mt-2 text-[var(--text-muted)]">{locale === "fr" ? "Retrouvez et mettez à jour les informations liées à votre compte." : "View and update the information associated with your account."}</p></div>

    <section className="grid gap-6 border border-[var(--line)] bg-[var(--surface)] p-6 md:grid-cols-[auto_1fr] md:p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-40 w-40" data-testid="profile-image-control">
          <div className="h-40 w-40 overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--foreground)] shadow-[0_16px_44px_rgba(15,22,16,.14)]">
            {profile.image ? <Image src={profile.image} alt={locale === "fr" ? "Photo de profil" : "Profile photo"} width={160} height={160} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-[var(--font-editorial)] text-4xl text-[var(--background)]">{initials}</div>}
          </div>
          <Tooltip label={locale === "fr" ? "Changer la photo" : "Change photo"}>
            <label className="absolute -bottom-1 -right-1 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--signal)] text-[#07140b] shadow-[0_8px_24px_rgba(15,22,16,.25)] transition-transform hover:scale-105 focus-within:ring-2 focus-within:ring-[var(--signal-strong)]">
              <ImagePlus size={18} aria-hidden="true" />
              <span className="sr-only">{locale === "fr" ? "Changer la photo" : "Change photo"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} />
            </label>
          </Tooltip>
          {profile.image && <Tooltip label={locale === "fr" ? "Supprimer la photo" : "Remove photo"}><button type="button" onClick={() => void removeImage()} disabled={imageBusy} aria-label={locale === "fr" ? "Supprimer la photo" : "Remove photo"} className="absolute -left-1 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface)] text-[var(--danger)] shadow-[0_8px_20px_rgba(15,22,16,.18)] transition hover:border-[var(--danger)] disabled:opacity-50"><Trash2 size={15} /></button></Tooltip>}
          {imageBusy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--surface)]/75"><Loader2 size={22} className="animate-spin" /></span>}
        </div>
        <p className="max-w-40 text-center text-[.68rem] leading-5 text-[var(--text-muted)]">{locale === "fr" ? "JPG, PNG ou WebP" : "JPG, PNG or WebP"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Email / Username", value: profile.email }, { label: locale === "fr" ? "Statut" : "Status", value: statusLabel }, { label: locale === "fr" ? "Région" : "Region", value: profile.regionId || "Global" }, { label: locale === "fr" ? "Newsletter" : "Newsletter", value: profile.subscribed ? (locale === "fr" ? "Abonné" : "Subscribed") : (locale === "fr" ? "Non abonné" : "Not subscribed") }].map((item) => <div key={item.label} className="border-l border-[var(--line)] pl-4"><p className="eyebrow mb-2">{item.label}</p><p className="break-words text-sm">{item.value}</p></div>)}
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[{ label: locale === "fr" ? "Téléchargements utilisés" : "Downloads used", value: profile.downloadsUsed ?? "—" }, { label: locale === "fr" ? "Restants" : "Remaining", value: profile.downloadsRemaining ?? "—" }, { label: locale === "fr" ? "Limite" : "Limit", value: profile.downloadLimit ?? "—" }, { label: "Stems", value: profile.downloadStem ? (locale === "fr" ? "Autorisés" : "Allowed") : (locale === "fr" ? "Non autorisés" : "Not allowed") }].map((item) => <div key={item.label} className="min-h-28 border border-[var(--line)] p-5"><p className="eyebrow">{item.label}</p><p className="mt-4 font-[var(--font-editorial)] text-3xl">{item.value}</p></div>)}
    </section>

    <section className="grid gap-4 border border-[var(--line)] bg-[var(--surface)] p-6 text-sm sm:grid-cols-2 lg:grid-cols-4 md:p-8">
      <div><p className="eyebrow mb-2">{locale === "fr" ? "Écoute" : "Preview"}</p><p>{profile.sampleEnabled ? (locale === "fr" ? "Écoute autorisée" : "Playback allowed") : (locale === "fr" ? "Écoute restreinte" : "Playback restricted")}</p></div>
      <div><p className="eyebrow mb-2">{locale === "fr" ? "Téléchargement" : "Download"}</p><p>{profile.downloadEnabled ? (profile.downloadEnabledType || (locale === "fr" ? "Autorisé" : "Allowed")) : (locale === "fr" ? "Restreint" : "Restricted")}</p></div>
      <div><p className="eyebrow mb-2">{locale === "fr" ? "Type de poste" : "Position type"}</p><p>{profile.positionType || "—"}{profile.freelancer ? ` · ${locale === "fr" ? "Indépendant" : "Freelance"}` : ""}</p></div>
      <div><p className="eyebrow mb-2">{locale === "fr" ? "Contact gestionnaire" : "Account manager"}</p><p>{profile.managedBy?.name || "—"}</p>{profile.managedBy?.email && <a className="mt-1 block break-all underline" href={`mailto:${profile.managedBy.email}`}>{profile.managedBy.email}</a>}</div>
    </section>

    <form onSubmit={save} className="border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
      <div className="mb-6"><h2 className="font-[var(--font-editorial)] text-3xl">{locale === "fr" ? "Identité et activité" : "Identity and business"}</h2><p className="mt-2 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Les champs professionnels et postaux sont facultatifs." : "Business and postal fields are optional."}</p></div>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="text-sm"><span className="mb-2 block">{locale === "fr" ? field.fr : field.en}{field.key === "firstName" || field.key === "lastName" || field.key === "country" ? " *" : ""}</span><Input type={field.type || "text"} value={String(form[field.key] ?? "")} required={field.key === "firstName" || field.key === "lastName" || field.key === "country"} onChange={(event) => setForm((current) => current ? { ...current, [field.key]: event.target.value } : current)} /></label>)}</div>
      {profile.fileFormats?.length ? <label className="mt-5 block max-w-md text-sm"><span className="mb-2 block">{locale === "fr" ? "Format de téléchargement préféré" : "Preferred download format"}</span><Select value={form.fileFormatId || ""} onValueChange={(value) => setForm((current) => current ? { ...current, fileFormatId: value } : current)} ariaLabel={locale === "fr" ? "Format de téléchargement préféré" : "Preferred download format"} className="w-full [&_[role=combobox]]:min-h-12" options={profile.fileFormats.map((format) => ({ value: format.id, label: format.label }))} /></label> : null}
      <div className="mt-7 flex flex-wrap items-center gap-4"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}{locale === "fr" ? "Enregistrer" : "Save"}</Button>{message && <p role="status" className="inline-flex items-center gap-2 text-sm"><Check size={15} />{message}</p>}</div>
    </form>
  </div>;
}
