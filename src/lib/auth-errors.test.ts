import { describe, expect, it } from "vitest";
import { loginErrorMessageKey, registrationErrorMessageKey } from "./auth-errors";

describe("login error localization", () => {
  it("recognizes Harvest's not-activated message", () => {
    expect(loginErrorMessageKey({ message: "Not activated", code: "FORBIDDEN" }))
      .toBe("auth.emailNotVerified");
  });

  it("distinguishes unverified accounts and invalid credentials", () => {
    expect(loginErrorMessageKey({ message: "Please verify your email address before signing in", code: "FORBIDDEN" }))
      .toBe("auth.emailNotVerified");
    expect(loginErrorMessageKey({ message: "Authentication failed", code: "UNAUTHENTICATED" }))
      .toBe("auth.invalidCredentials");
  });

  it("uses a localized generic message for unknown upstream errors", () => {
    expect(loginErrorMessageKey({ message: "Unexpected upstream response" }))
      .toBe("auth.loginFailed");
  });
});

describe("registration error localization", () => {
  it("recognizes an existing account that is waiting for email verification", () => {
    expect(registrationErrorMessageKey({ message: "Username already exists (Account is pending)", code: "VALIDATION_FAILED" }))
      .toBe("auth.registrationPending");
  });

  it("distinguishes an email already used by an active account", () => {
    expect(registrationErrorMessageKey({ message: "Username already exists", code: "VALIDATION_FAILED" }))
      .toBe("auth.emailAlreadyUsed");
  });
});
