export const PASSWORD_MIN_LENGTH = 8;

export type PasswordStrengthLevel = "weak" | "medium" | "strong";

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  value: 1 | 2 | 3;
}

export function meetsPasswordPolicy(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && /[A-Z]/.test(password)
    && /\d/.test(password);
}

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  if (!meetsPasswordPolicy(password)) {
    return { level: "weak", value: 1 };
  }

  const characterClasses = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  if (
    (password.length >= 14 && characterClasses >= 3)
    || (password.length >= 18 && characterClasses >= 2)
  ) {
    return { level: "strong", value: 3 };
  }

  return { level: "medium", value: 2 };
}
