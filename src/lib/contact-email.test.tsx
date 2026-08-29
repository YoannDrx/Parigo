import { describe, expect, it } from "vitest";
import { renderContactAcknowledgementEmail, renderContactNotificationEmail } from "./contact-email";

describe("contact email templates", () => {
  it("escapes user content in the internal notification", async () => {
    const rendered = await renderContactNotificationEmail({
      requestId: "request-123",
      receivedAt: "30 août 2026 à 00:45",
      name: "Camille Martin",
      company: "Studio Exemple",
      email: "camille@example.com",
      message: "Bonjour <script>alert('x')</script>, nous cherchons une musique.",
      locale: "fr",
      track: null,
    });
    expect(rendered.html).toContain("Un nouveau projet arrive");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<script>alert");
    expect(rendered.text).toContain("request-123");
  });

  it("localizes the acknowledgement in English", async () => {
    const rendered = await renderContactAcknowledgementEmail({ locale: "en", name: "Alex", receivedAt: "30 August 2026 at 00:45", requestId: "request-456" });
    expect(rendered.html).toContain("Thank you, Alex");
    expect(rendered.text).toContain("DELIVERY CONFIRMED");
  });
});
