import { describe, expect, it } from "vitest";
import { getPasswordStrength, meetsPasswordPolicy } from "./password-strength";

describe("password strength", () => {
  it("keeps an empty field neutral", () => {
    expect(getPasswordStrength("")).toBeNull();
  });

  it("marks incomplete passwords as weak", () => {
    expect(getPasswordStrength("password")).toEqual({ level: "weak", value: 1 });
    expect(getPasswordStrength("Password")).toEqual({ level: "weak", value: 1 });
  });

  it("marks a password meeting the current policy as medium", () => {
    expect(getPasswordStrength("Parigo2026")).toEqual({ level: "medium", value: 2 });
  });

  it("reserves the strong level for longer, more varied passwords", () => {
    expect(getPasswordStrength("Ui-Form-Value-1")).toEqual({ level: "strong", value: 3 });
    expect(getPasswordStrength("LonguePhraseParigo2026")).toEqual({ level: "strong", value: 3 });
  });

  it("shares the same minimum policy across password creation flows", () => {
    expect(meetsPasswordPolicy("Parigo2026")).toBe(true);
    expect(meetsPasswordPolicy("parigo2026")).toBe(false);
    expect(meetsPasswordPolicy("ParigoTest")).toBe(false);
  });
});
