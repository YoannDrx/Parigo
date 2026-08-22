"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { PasswordCreationField } from "@/components/features/PasswordCreationField";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/components/providers/I18nProvider";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { registrationErrorMessageKey } from "@/lib/auth-errors";
import { meetsPasswordPolicy } from "@/lib/password-strength";

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
  onSuccess?: (email: string, verificationEmailSent: boolean) => void;
} = {}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [formats, setFormats] = useState<Array<{ id: string; label: string }>>([]);
  const [countries, setCountries] = useState(fallbackCountries);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
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

  useEffect(() => {
    if (!error) return;
    const frame = window.requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      errorRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const fail = (message: string, id: string) => {
      setError(message);
      window.requestAnimationFrame(() => {
        const field = formRef.current?.querySelector<HTMLElement>(`#${id}`);
        field?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
        field?.focus({ preventScroll: true });
      });
    };
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return fail(locale === "fr" ? "Veuillez renseigner tous les champs obligatoires." : "Please complete all required fields.", !form.firstName.trim() ? "firstName" : !form.lastName.trim() ? "lastName" : "email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return fail(locale === "fr" ? "Veuillez saisir une adresse e-mail valide." : "Please enter a valid email address.", "email");
    if (!meetsPasswordPolicy(form.password)) return fail(locale === "fr" ? "Le mot de passe ne respecte pas tous les critères." : "The password does not meet every requirement.", "password");
    if (form.password !== form.confirmPassword) return fail(locale === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.", "confirmPassword");
    if (!form.country) return fail(locale === "fr" ? "Veuillez sélectionner votre pays." : "Please select your country.", "country");
    if (!form.termsAccepted || !form.privacyAccepted) return fail(locale === "fr" ? "Veuillez cocher les deux cases obligatoires pour accepter les conditions d’utilisation et la politique de confidentialité." : "Please tick both required boxes to accept the terms of use and privacy policy.", !form.termsAccepted ? "termsAccepted" : "privacyAccepted");
    setIsLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = form;
      void _confirmPassword;
      const result = await signUp.email(payload);
      if (result.error) {
        setError(t(registrationErrorMessageKey(result.error)));
      } else {
        const verificationEmailSent = result.data?.verificationEmailSent !== false;
        if (onSuccess) onSuccess(form.email, verificationEmailSent);
        else router.push(`/register/success?email=${encodeURIComponent(form.email)}&sent=${verificationEmailSent ? "1" : "0"}`);
      }
    } catch {
      setError(locale === "fr" ? "Une erreur est survenue lors de l’inscription." : "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: embedded ? 8 : 20 }} animate={{ opacity: 1, y: 0 }} className={embedded ? "w-full" : "w-full max-w-3xl py-8"}>
      <Card hover={false} padding={embedded ? "none" : "lg"} className={embedded ? "border-0 bg-[var(--surface)] shadow-none" : "border-[var(--line)] bg-[var(--surface)] shadow-none"}>
        <div className="mb-8">
          <p className="eyebrow mb-4 text-[var(--signal-strong)]">{locale === "fr" ? "Compte Parigo" : "Parigo account"}</p>
          <SignedTitle id={headingId} variant="compact" className="font-semibold">{t("auth.register")}</SignedTitle>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{locale === "fr" ? "Créez vos identifiants et complétez votre profil en un seul parcours." : "Create your credentials and complete your profile in one flow."}</p>
        </div>

        {error && <div ref={errorRef} role="alert" tabIndex={-1} className="contact-consent-error mb-6 !block outline-none"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-[var(--danger)]" size={19} /><p className="leading-6">{error}</p></div></div>}

        <form ref={formRef} onSubmit={submit} noValidate className="space-y-9">
          <section className="space-y-6" aria-labelledby="register-identity">
            <h2 id="register-identity" className="border-b border-[var(--line)] pb-3 font-[var(--font-editorial)] text-xl font-semibold">{locale === "fr" ? "Identité et sécurité" : "Identity and security"}</h2>
            <div className="grid gap-5 sm:grid-cols-2"><Field id="firstName" label={locale === "fr" ? "Prénom" : "First name"} value={form.firstName} onChange={(value) => set("firstName", value)} required autoComplete="given-name" /><Field id="lastName" label={locale === "fr" ? "Nom" : "Last name"} value={form.lastName} onChange={(value) => set("lastName", value)} required autoComplete="family-name" /></div>
            <Field id="email" label={`${t("auth.email")} (${locale === "fr" ? "utilisé comme identifiant" : "used as username"})`} value={form.email} onChange={(value) => set("email", value)} required type="email" autoComplete="email" />
            <div className="grid items-start gap-5 sm:grid-cols-2">
              <PasswordCreationField id="password" label={t("auth.password")} value={form.password} onChange={(value) => set("password", value)} showStrength />
              <PasswordCreationField id="confirmPassword" label={locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"} value={form.confirmPassword} onChange={(value) => set("confirmPassword", value)} confirmationOf={form.password} showLabel={locale === "fr" ? "Afficher la confirmation du mot de passe" : "Show password confirmation"} hideLabel={locale === "fr" ? "Masquer la confirmation du mot de passe" : "Hide password confirmation"} />
            </div>
          </section>
          <section className="space-y-6" aria-labelledby="register-profile">
            <h2 id="register-profile" className="border-b border-[var(--line)] pb-3 font-[var(--font-editorial)] text-xl font-semibold">{locale === "fr" ? "Profil professionnel" : "Professional profile"}</h2>
            <div className="grid gap-5 sm:grid-cols-2"><Field id="company" label={locale === "fr" ? "Société" : "Company"} value={form.company} onChange={(value) => set("company", value)} /><label htmlFor="country" className="block text-sm font-medium"><span className="mb-2 block">{locale === "fr" ? "Pays *" : "Country *"}</span><Select id="country" name="country" value={form.country} onValueChange={(value) => set("country", value)} ariaLabel={locale === "fr" ? "Pays *" : "Country *"} className="w-full [&_[role=combobox]]:min-h-12" options={countries.map((country) => ({ value: country.code, label: country.name }))} /></label></div>
            <div className="grid gap-5 sm:grid-cols-3"><Field id="production" label="Production" value={form.production} onChange={(value) => set("production", value)} /><Field id="subProduction" label={locale === "fr" ? "Sous-production" : "Sub-production"} value={form.subProduction} onChange={(value) => set("subProduction", value)} /><Field id="position" label={locale === "fr" ? "Poste" : "Position"} value={form.position} onChange={(value) => set("position", value)} /></div>
          </section>
          <section className="space-y-6" aria-labelledby="register-address">
            <h2 id="register-address" className="border-b border-[var(--line)] pb-3 font-[var(--font-editorial)] text-xl font-semibold">{locale === "fr" ? "Adresse et préférences" : "Address and preferences"}</h2>
            <div className="grid gap-5 sm:grid-cols-2"><Field id="address1" label={locale === "fr" ? "Adresse" : "Address"} value={form.address1} onChange={(value) => set("address1", value)} autoComplete="address-line1" /><Field id="address2" label={locale === "fr" ? "Complément d’adresse" : "Address line 2"} value={form.address2} onChange={(value) => set("address2", value)} autoComplete="address-line2" /><Field id="suburb" label={locale === "fr" ? "Ville" : "City"} value={form.suburb} onChange={(value) => set("suburb", value)} autoComplete="address-level2" /><Field id="state" label={locale === "fr" ? "État / région" : "State / region"} value={form.state} onChange={(value) => set("state", value)} autoComplete="address-level1" /><Field id="postcode" label={locale === "fr" ? "Code postal" : "Postcode"} value={form.postcode} onChange={(value) => set("postcode", value)} autoComplete="postal-code" /><Field id="phone" label={locale === "fr" ? "Téléphone" : "Phone"} value={form.phone} onChange={(value) => set("phone", value)} type="tel" autoComplete="tel" /></div>
            {formats.length > 0 && <label htmlFor="fileFormatId" className="block text-sm font-medium"><span className="mb-2 block">{locale === "fr" ? "Format de téléchargement préféré" : "Preferred download format"}</span><Select id="fileFormatId" name="fileFormatId" value={form.fileFormatId} onValueChange={(value) => set("fileFormatId", value)} ariaLabel={locale === "fr" ? "Format de téléchargement préféré" : "Preferred download format"} className="w-full [&_[role=combobox]]:min-h-12" options={formats.map((format) => ({ value: format.id, label: format.label }))} /></label>}
          </section>
          <section className="space-y-4" aria-labelledby="register-consents">
            <h2 id="register-consents" className="border-b border-[var(--line)] pb-3 font-[var(--font-editorial)] text-xl font-semibold">{locale === "fr" ? "Consentements" : "Consents"}</h2>
            <div className="space-y-3 text-sm"><label className="flex items-start gap-3"><input id="termsAccepted" type="checkbox" required aria-invalid={Boolean(error && !form.termsAccepted)} checked={form.termsAccepted} onChange={(event) => set("termsAccepted", event.target.checked)} /><span>{locale === "fr" ? "J’accepte les " : "I accept the "}<Link className="underline" href="/terms">{locale === "fr" ? "conditions d’utilisation" : "terms of use"}</Link>.</span></label><label className="flex items-start gap-3"><input id="privacyAccepted" type="checkbox" required aria-invalid={Boolean(error && !form.privacyAccepted)} checked={form.privacyAccepted} onChange={(event) => set("privacyAccepted", event.target.checked)} /><span>{locale === "fr" ? "J’accepte la " : "I accept the "}<Link className="underline" href="/privacy">{locale === "fr" ? "politique de confidentialité" : "privacy policy"}</Link>.</span></label><label className="flex items-start gap-3"><input type="checkbox" checked={form.subscribe} onChange={(event) => set("subscribe", event.target.checked)} /><span>{locale === "fr" ? "Recevoir la newsletter et les nouvelles sorties Parigo" : "Receive the Parigo newsletter and new releases"}</span></label></div>
          </section>
          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>{isLoading ? <><ParigoLoader size="icon" label={t("auth.registering")} />{t("auth.registering")}</> : t("auth.register")}</Button>
        </form>
        <p className="mt-7 text-center text-sm text-[var(--text-muted)]">{t("auth.hasAccount")} {onLogin ? <button type="button" onClick={onLogin} className="font-medium underline">{t("auth.login")}</button> : <Link href="/login" className="font-medium underline">{t("auth.login")}</Link>}</p>
      </Card>
    </motion.div>
  );
}
