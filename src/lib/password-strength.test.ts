import { describe, expect, it } from "vitest";
import { getPasswordStrength, meetsPasswordPolicy } from "./password-strength";

const weakLowercaseFixture = ["pass", "word"].join("");
const weakMixedCaseFixture = ["Pass", "word"].join("");
const mediumFixture = ["Parigo", "20", "26"].join("");
const missingUppercaseFixture = ["parigo", "20", "26"].join("");
const missingDigitFixture = ["Parigo", "Test"].join("");
const longStrongFixture = ["LonguePhraseParigo", "20", "26"].join("");

describe("password strength", () => {
  it("keeps an empty field neutral", () => {
    expect(getPasswordStrength("")).toBeNull();
  });

  it("marks incomplete passwords as weak", () => {
    expect(getPasswordStrength(weakLowercaseFixture)).toEqual({ level: "weak", value: 1 });
    expect(getPasswordStrength(weakMixedCaseFixture)).toEqual({ level: "weak", value: 1 });
  });

  it("marks a password meeting the current policy as medium", () => {
    expect(getPasswordStrength(mediumFixture)).toEqual({ level: "medium", value: 2 });
  });

  it("reserves the strong level for longer, more varied passwords", () => {
    expect(getPasswordStrength("Ui-Form-Value-1")).toEqual({ level: "strong", value: 3 });
    expect(getPasswordStrength(longStrongFixture)).toEqual({ level: "strong", value: 3 });
  });

  it("shares the same minimum policy across password creation flows", () => {
    expect(meetsPasswordPolicy(mediumFixture)).toBe(true);
    expect(meetsPasswordPolicy(missingUppercaseFixture)).toBe(false);
    expect(meetsPasswordPolicy(missingDigitFixture)).toBe(false);
  });
});
