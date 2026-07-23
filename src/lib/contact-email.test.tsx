import { describe, expect, it } from "vitest";
import {
  renderContactAcknowledgementEmail,
  renderContactNotificationEmail,
} from "./contact-email";

describe("contact email templates", () => {
  it("rend la notification interne en HTML sûr et en texte brut", async () => {
    const rendered = await renderContactNotificationEmail({
      requestId: "request-123",
      receivedAt: "23 juillet 2026 à 21:45",
      name: "Camille Martin",
      company: "Studio Exemple",
      email: "camille@example.com",
      message: "Bonjour <script>alert('x')</script>, nous cherchons une musique.",
      locale: "fr",
      track: {
        title: "Signal",
        albumTitle: "Cinéma",
        reference: "PGO-001",
        verified: true,
      },
    });

    expect(rendered.html).toContain("Un nouveau projet arrive");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<script>alert");
    expect(rendered.text).toContain("Camille Martin");
    expect(rendered.text).toContain("request-123");
  });

  it("localise l’accusé en anglais", async () => {
    const rendered = await renderContactAcknowledgementEmail({
      locale: "en",
      name: "Alex",
      receivedAt: "July 23, 2026 at 9:45 PM",
      requestId: "request-456",
    });

    expect(rendered.html).toContain("Thank you, Alex");
    expect(rendered.text).toContain("DELIVERY CONFIRMED");
    expect(rendered.text).toContain("request-456");
  });
});
