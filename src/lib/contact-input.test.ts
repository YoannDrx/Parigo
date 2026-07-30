import { describe, expect, it } from "vitest";
import {
  CONTACT_MAX_FILE_BYTES,
  contactInputSchema,
  sanitizeContactAttachmentName,
  validateContactAttachmentBytes,
  validateContactAttachmentMetadata,
} from "./contact-input";

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

  it("valide une pièce jointe PDF cohérente", () => {
    expect(validateContactAttachmentMetadata({
      name: "brief.pdf",
      type: "application/pdf",
      size: 1200,
    })).toMatchObject({ valid: true, extension: "pdf" });
    expect(validateContactAttachmentBytes("pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
  });

  it("rejette les extensions risquées, les types falsifiés et les fichiers trop lourds", () => {
    expect(validateContactAttachmentMetadata({ name: "script.js", type: "text/javascript", size: 20 }).valid).toBe(false);
    expect(validateContactAttachmentMetadata({ name: "image.jpg", type: "application/pdf", size: 20 }).valid).toBe(false);
    expect(validateContactAttachmentMetadata({ name: "brief.pdf", type: "application/pdf", size: CONTACT_MAX_FILE_BYTES + 1 }).valid).toBe(false);
    expect(validateContactAttachmentBytes("pdf", new TextEncoder().encode("not a pdf"))).toBe(false);
  });

  it("neutralise les chemins et caractères de contrôle dans le nom de fichier", () => {
    expect(sanitizeContactAttachmentName("../brief\u0000.pdf")).toBe("..-brief-.pdf");
  });
});
