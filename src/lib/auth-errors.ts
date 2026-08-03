import type { AuthClientError } from "./auth-client";

export type LoginErrorMessageKey =
  | "auth.accountNotActivated"
  | "auth.emailNotVerified"
  | "auth.invalidCredentials"
  | "auth.accountUnavailable"
  | "auth.loginFailed";

export function loginErrorMessageKey(error: AuthClientError): LoginErrorMessageKey {
  const message = error.message.trim().toLowerCase();

  if (/unverified|not activat|not active|account.*pending|pending.*account|awaiting.*approval|pending.*approval|verify.*(?:e-?mail|email)|(?:e-?mail|email).*verif/.test(message)) {
    return "auth.emailNotVerified";
  }

  switch (error.code) {
    case "FORBIDDEN":
      return "auth.accountNotActivated";
    case "UNAUTHENTICATED":
      return "auth.invalidCredentials";
    case "ACCOUNT_UNAVAILABLE":
      return "auth.accountUnavailable";
    default:
      return "auth.loginFailed";
  }
}

export type RegistrationErrorMessageKey =
  | "auth.registrationPending"
  | "auth.emailAlreadyUsed"
  | "auth.accountUnavailable"
  | "auth.registrationFailed";

export function registrationErrorMessageKey(error: AuthClientError): RegistrationErrorMessageKey {
  const message = error.message.trim().toLowerCase();

  if (/account.*pending|pending.*account|unverified|verify.*(?:e-?mail|email)/.test(message)) {
    return "auth.registrationPending";
  }
  if (/username.*(?:already|exist)|(?:e-?mail|email).*(?:already|exist)|already.*registered/.test(message)) {
    return "auth.emailAlreadyUsed";
  }
  if (error.code === "ACCOUNT_UNAVAILABLE") return "auth.accountUnavailable";
  return "auth.registrationFailed";
}
