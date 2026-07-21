"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Button, Card, Input } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: string;
  country: string;
  production: string;
  subProduction: string;
  position: string;
  address1: string;
  address2: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
  fileFormatId: string;
  subscribe: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

const initialForm: RegistrationForm = {
  firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  company: "", country: "FR", production: "", subProduction: "", position: "",
  address1: "", address2: "", suburb: "", state: "", postcode: "", phone: "",
  fileFormatId: "", subscribe: false, termsAccepted: false, privacyAccepted: false,
};

const fallbackCountries = [{ code: "FR", name: "France" }, { code: "BE", name: "Belgium" }, { code: "CH", name: "Switzerland" }, { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" }];

function Field({ label, id, value, onChange, required, type = "text", autoComplete }: { label: string; id: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; autoComplete?: string }) {
  return <label htmlFor={id} className="block text-sm font-medium"><span className="mb-2 block">{label}{required ? " *" : ""}</span><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete={autoComplete} /></label>;
}

export function RegisterForm({
  embedded = false,
  headingId,
  onLogin,
  onSuccess,
}: {
  embedded?: boolean;
  headingId?: string;
  onLogin?: () => void;
  onSuccess?: (email: string) => void;
} = {}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(initialForm);
  const [formats, setFormats] = useState<Array<{ id: string; label: string }>>([]);
  const [countries, setCountries] = useState(fallbackCountries);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const set = <K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const passwordRequirements = useMemo(() => [
    { label: locale === "fr" ? "Au moins 8 caractères" : "At least 8 characters", met: form.password.length >= 8 },
    { label: locale === "fr" ? "Au moins une majuscule" : "At least one uppercase letter", met: /[A-Z]/.test(form.password) },
    { label: locale === "fr" ? "Au moins un chiffre" : "At least one number", met: /[0-9]/.test(form.password) },
  ], [form.password, locale]);

  useEffect(() => {
    void fetch("/api/download-formats")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const nextFormats = (payload?.data?.formats ?? []) as Array<{ id: string; label: string }>;
        setFormats(nextFormats);
        const preferred = nextFormats.find((item) => /mp3.*320|320.*mp3/i.test(item.label)) ?? nextFormats[0];
        if (preferred) setForm((current) => ({ ...current, fileFormatId: current.fileFormatId || preferred.id }));
      })
      .catch(() => undefined);
    void fetch("/api/countries")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.data?.countries?.length) setCountries(payload.data.countries); })
      .catch(() => undefined);
  }, []);

  const continueToProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.firstName || !form.lastName || !form.email) return setError(locale === "fr" ? "Complétez les champs obligatoires." : "Complete all required fields.");
    if (form.password !== form.confirmPassword) return setError(locale === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
    if (!passwordRequirements.every((requirement) => requirement.met)) return setError(locale === "fr" ? "Le mot de passe ne respecte pas tous les critères." : "The password does not meet every requirement.");
    setStep(2);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.country || !form.termsAccepted || !form.privacyAccepted) return setError(locale === "fr" ? "Le pays, les conditions et la confidentialité sont obligatoires." : "Country, terms and privacy consent are required.");
    setIsLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      void _confirmPassword;
      const result = await signUp.email(payload);
      if (result.error) setError(result.error.message || (locale === "fr" ? "Inscription impossible." : "Registration failed."));
      else if (onSuccess) onSuccess(form.email);
      else router.push(`/register/success?email=${encodeURIComponent(form.email)}`);
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de l’inscription." : "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: embedded ? 8 : 20 }} animate={{ opacity: 1, y: 0 }} className={embedded ? "w-full" : "w-full max-w-3xl py-8"}>
      <Card padding="lg" className={embedded ? "border-0 bg-[var(--surface)] shadow-none" : "border-[var(--line)] bg-[var(--surface)] shadow-none"}>
        <div className="mb-8 flex items-start justify-between gap-6">
          <div><p className="eyebrow mb-4 text-[var(--color-primary-dark)]">Compte Parigo</p><h1 id={headingId} className="font-[var(--font-editorial)] text-5xl tracking-[-.055em] md:text-6xl">{t("auth.register")}</h1><p className="mt-3 text-[var(--text-muted)]">{step === 1 ? (locale === "fr" ? "Créez vos identifiants Parigo." : "Create your Parigo credentials.") : (locale === "fr" ? "Complétez votre profil Parigo." : "Complete your Parigo profile.")}</p></div>
          <span className="font-mono text-xs opacity-55">{step}/2</span>
        </div>
        <div className="mb-8 grid grid-cols-2 gap-2" aria-hidden="true"><div className="h-1 bg-[var(--foreground)]" /><div className={cnStep(step === 2)} /></div>

        {error && <div role="alert" className="mb-6 flex items-center gap-3 border border-red-300 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={19} />{error}</div>}

        {step === 1 ? (
          <form onSubmit={continueToProfile} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2"><Field id="firstName" label={locale === "fr" ? "Prénom" : "First name"} value={form.firstName} onChange={(value) => set("firstName", value)} required autoComplete="given-name" /><Field id="lastName" label={locale === "fr" ? "Nom" : "Last name"} value={form.lastName} onChange={(value) => set("lastName", value)} required autoComplete="family-name" /></div>
            <Field id="email" label={`${t("auth.email")} (${locale === "fr" ? "utilisé comme identifiant" : "used as username"})`} value={form.email} onChange={(value) => set("email", value)} required type="email" autoComplete="email" />
            <div className="grid gap-5 sm:grid-cols-2"><Field id="password" label={t("auth.password")} value={form.password} onChange={(value) => set("password", value)} required type="password" autoComplete="new-password" /><Field id="confirmPassword" label={locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"} value={form.confirmPassword} onChange={(value) => set("confirmPassword", value)} required type="password" autoComplete="new-password" /></div>
            {form.password && <div className="grid gap-2 text-xs sm:grid-cols-3">{passwordRequirements.map((requirement) => <span key={requirement.label} className={requirement.met ? "text-green-700" : "text-[var(--text-muted)]"}>{requirement.met ? <CheckCircle className="mr-1 inline" size={14} /> : "○ "}{requirement.label}</span>)}</div>}
            <Button type="submit" size="lg" className="w-full">{locale === "fr" ? "Continuer vers le profil" : "Continue to profile"}<ArrowRight size={18} /></Button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-7">
            <div className="grid gap-5 sm:grid-cols-2"><Field id="company" label={locale === "fr" ? "Société" : "Company"} value={form.company} onChange={(value) => set("company", value)} /><label htmlFor="country" className="block text-sm font-medium"><span className="mb-2 block">{locale === "fr" ? "Pays *" : "Country *"}</span><select id="country" required value={form.country} onChange={(event) => set("country", event.target.value)} className="h-12 w-full border border-[var(--line)] bg-transparent px-3">{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label></div>
            <div className="grid gap-5 sm:grid-cols-3"><Field id="production" label="Production" value={form.production} onChange={(value) => set("production", value)} /><Field id="subProduction" label={locale === "fr" ? "Sous-production" : "Sub-production"} value={form.subProduction} onChange={(value) => set("subProduction", value)} /><Field id="position" label={locale === "fr" ? "Poste" : "Position"} value={form.position} onChange={(value) => set("position", value)} /></div>
            <div className="grid gap-5 sm:grid-cols-2"><Field id="address1" label={locale === "fr" ? "Adresse" : "Address"} value={form.address1} onChange={(value) => set("address1", value)} autoComplete="address-line1" /><Field id="address2" label={locale === "fr" ? "Complément d’adresse" : "Address line 2"} value={form.address2} onChange={(value) => set("address2", value)} autoComplete="address-line2" /><Field id="suburb" label={locale === "fr" ? "Ville" : "City"} value={form.suburb} onChange={(value) => set("suburb", value)} autoComplete="address-level2" /><Field id="state" label={locale === "fr" ? "État / région" : "State / region"} value={form.state} onChange={(value) => set("state", value)} autoComplete="address-level1" /><Field id="postcode" label={locale === "fr" ? "Code postal" : "Postcode"} value={form.postcode} onChange={(value) => set("postcode", value)} autoComplete="postal-code" /><Field id="phone" label={locale === "fr" ? "Téléphone" : "Phone"} value={form.phone} onChange={(value) => set("phone", value)} type="tel" autoComplete="tel" /></div>
            {formats.length > 0 && <label htmlFor="fileFormatId" className="block text-sm font-medium"><span className="mb-2 block">{locale === "fr" ? "Format de téléchargement préféré" : "Preferred download format"}</span><select id="fileFormatId" value={form.fileFormatId} onChange={(event) => set("fileFormatId", event.target.value)} className="h-12 w-full border border-[var(--line)] bg-transparent px-3">{formats.map((format) => <option key={format.id} value={format.id}>{format.label}</option>)}</select></label>}
            <div className="space-y-3 border-t border-[var(--line)] pt-6 text-sm"><label className="flex items-start gap-3"><input type="checkbox" required checked={form.termsAccepted} onChange={(event) => set("termsAccepted", event.target.checked)} /><span>{locale === "fr" ? "J’accepte les " : "I accept the "}<Link className="underline" href="/terms">{locale === "fr" ? "conditions d’utilisation" : "terms of use"}</Link>.</span></label><label className="flex items-start gap-3"><input type="checkbox" required checked={form.privacyAccepted} onChange={(event) => set("privacyAccepted", event.target.checked)} /><span>{locale === "fr" ? "J’accepte la " : "I accept the "}<Link className="underline" href="/privacy">{locale === "fr" ? "politique de confidentialité" : "privacy policy"}</Link>.</span></label><label className="flex items-start gap-3"><input type="checkbox" checked={form.subscribe} onChange={(event) => set("subscribe", event.target.checked)} /><span>{locale === "fr" ? "Recevoir la newsletter et les nouvelles sorties Parigo" : "Receive the Parigo newsletter and new releases"}</span></label></div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} disabled={isLoading}><ArrowLeft size={18} />{locale === "fr" ? "Retour" : "Back"}</Button><Button type="submit" size="lg" className="flex-1" disabled={isLoading}>{isLoading ? <><Loader2 className="animate-spin" size={18} />{t("auth.registering")}</> : t("auth.register")}</Button></div>
          </form>
        )}
        <p className="mt-7 text-center text-sm text-[var(--text-muted)]">{t("auth.hasAccount")} {onLogin ? <button type="button" onClick={onLogin} className="font-medium underline">{t("auth.login")}</button> : <Link href="/login" className="font-medium underline">{t("auth.login")}</Link>}</p>
      </Card>
    </motion.div>
  );
}

export default function RegisterPage() {
  return <RegisterForm />;
}

function cnStep(active: boolean) {
  return active ? "h-1 bg-[var(--foreground)]" : "h-1 bg-[var(--line)]";
}
