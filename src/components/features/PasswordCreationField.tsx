"use client";

import { CheckCircle, Eye, EyeOff, XCircle } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPasswordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password-strength";

type PasswordCreationFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  confirmationOf?: string;
  showLabel?: string;
  hideLabel?: string;
};

const levelColors = {
  weak: "var(--danger)",
  medium: "var(--color-accent-yellow)",
  strong: "var(--signal-strong)",
} as const;

export function PasswordCreationField({
  id,
  label,
  value,
  onChange,
  showStrength = false,
  confirmationOf,
  showLabel,
  hideLabel,
  className,
  required = true,
  autoComplete = "new-password",
  minLength = PASSWORD_MIN_LENGTH,
  ...inputProps
}: PasswordCreationFieldProps) {
  const { locale, t } = useI18n();
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : null;
  const feedbackId = `${id}-feedback`;
  const toggleLabel = visible
    ? (hideLabel ?? t("auth.hidePassword"))
    : (showLabel ?? t("auth.showPassword"));
  const strengthLabels = locale === "fr"
    ? { weak: "Faible", medium: "Moyen", strong: "Fort" }
    : { weak: "Weak", medium: "Medium", strong: "Strong" };
  const strengthHints = locale === "fr"
    ? {
        weak: `Utilisez au moins ${PASSWORD_MIN_LENGTH} caractères, une majuscule et un chiffre.`,
        medium: "Bon début — quelques caractères de plus le renforceront.",
        strong: "Mot de passe fort.",
      }
    : {
        weak: `Use at least ${PASSWORD_MIN_LENGTH} characters, one uppercase letter and one number.`,
        medium: "Good start — a few more characters will make it stronger.",
        strong: "Strong password.",
      };
  const confirmationVisible = confirmationOf !== undefined && value.length > 0;
  const confirmationMatches = confirmationVisible && value === confirmationOf;
  const describedBy = [
    inputProps["aria-describedby"],
    showStrength || confirmationVisible ? feedbackId : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}{required ? " *" : ""}
      </label>
      <div className="relative">
        <Input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          aria-describedby={describedBy}
          aria-invalid={confirmationVisible && !confirmationMatches ? true : inputProps["aria-invalid"]}
          className={cn("pr-14", className)}
        />
        <button
          type="button"
          aria-label={toggleLabel}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-0.5 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-strong)]"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>

      {showStrength ? (
        <div id={feedbackId} className="mt-2.5" data-password-strength={strength?.level ?? "empty"}>
          <div
            role="meter"
            aria-label={locale === "fr" ? "Force du mot de passe" : "Password strength"}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={strength?.value ?? 0}
            aria-valuetext={strength ? strengthLabels[strength.level] : (locale === "fr" ? "Non renseigné" : "Empty")}
            className="grid grid-cols-3 gap-1.5"
          >
            {[1, 2, 3].map((segment) => {
              const active = Boolean(strength && segment <= strength.value);
              return (
                <span
                  key={segment}
                  aria-hidden="true"
                  className="h-1 rounded-full transition-[background-color,opacity] duration-300 motion-reduce:transition-none"
                  style={{
                    backgroundColor: active && strength ? levelColors[strength.level] : "var(--line)",
                    opacity: active ? 1 : 0.72,
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex min-h-4 items-start justify-between gap-3 text-[.68rem] leading-4">
            <span className="text-[var(--text-muted)]">
              {strength
                ? strengthHints[strength.level]
                : locale === "fr"
                  ? `${PASSWORD_MIN_LENGTH} caractères minimum · une majuscule · un chiffre`
                  : `${PASSWORD_MIN_LENGTH} characters minimum · one uppercase · one number`}
            </span>
            {strength ? (
              <strong className="shrink-0 font-semibold" style={{ color: levelColors[strength.level] }}>
                {strengthLabels[strength.level]}
              </strong>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirmationVisible ? (
        <p
          id={feedbackId}
          className={cn(
            "mt-2 flex items-center gap-1.5 text-[.68rem] font-medium",
            confirmationMatches ? "text-[var(--signal-strong)]" : "text-[var(--danger)]",
          )}
        >
          {confirmationMatches ? <CheckCircle aria-hidden="true" size={14} /> : <XCircle aria-hidden="true" size={14} />}
          {confirmationMatches
            ? locale === "fr" ? "Les mots de passe correspondent." : "Passwords match."
            : locale === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}
        </p>
      ) : null}
    </div>
  );
}
