import { describe, expect, it } from "vitest";
import { contactInputSchema } from "./contact-input";

const validInput = {
  name: "Camille Martin",
  company: "Studio Exemple",
  email: "camille@example.com",
  message: "Nous préparons un film de trente secondes pour une campagne.",
  locale: "fr" as const,
  consent: true as const,
  website: "",
  startedAt: Date.now() - 5_000,
};

describe("contactInputSchema", () => {
  it("accepte le contrat public complet", () => {
    expect(contactInputSchema.parse({ ...validInput, trackId: "track-123" })).toMatchObject({ locale: "fr", consent: true });
  });

  it.each([
    { ...validInput, name: "A" },
    { ...validInput, email: "adresse-invalide" },
    { ...validInput, message: "Trop court" },
    { ...validInput, consent: false },
    { ...validInput, locale: "de" },
  ])("rejette une entrée invalide", (input) => {
    expect(contactInputSchema.safeParse(input).success).toBe(false);
  });
});
