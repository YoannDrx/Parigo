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
    expect(rendered.html.match(/parigo-logo-email\.png/g)).toHaveLength(2);
    expect(rendered.html).toContain("9 rue Rémy Dumoncel");
    expect(rendered.html).toContain("+33 (0)1 49 23 94 76");
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
    expect(rendered.html).toContain("/account");
    expect(rendered.html).toContain("Sign in to my account");
  });

  it("nettoie les retours ligne parasites de l’URL publique", async () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://parigo-ten.vercel.app\\n";
    try {
      const rendered = await renderContactAcknowledgementEmail({
        locale: "fr",
        name: "Camille",
        receivedAt: "29 juillet 2026 à 23:21",
        requestId: "request-clean-url",
      });
      expect(rendered.html).toContain("https://parigo-ten.vercel.app/images/parigo-logo-email.png");
      expect(rendered.html).not.toContain("vercel.app\\n");
    } finally {
      if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
  });
});
