import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resend: vi.fn(),
  harvest: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.resend };
  },
}));
vi.mock("./harvest/contact", () => ({ sendHarvestContactEmail: mocks.harvest }));

import { ContactProviderError, contactDeliveryDigest, deliverContactMessage, type ContactDeliveryInput } from "./contact-delivery";

const input: ContactDeliveryInput = {
  requestId: "request-123",
  name: "Camille Martin",
  company: "Studio Exemple",
  email: "camille@example.com",
  locale: "fr",
  message: "Nous cherchons une musique élégante pour notre prochain film de marque.",
  subject: "Demande Parigo Music — Camille Martin",
  harvestMessage: "Entreprise: Studio Exemple\n\nNous cherchons une musique élégante.",
  track: null,
};

describe("contact delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONTACT_EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "re_test_key";
    mocks.resend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterEach(() => {
    delete process.env.CONTACT_EMAIL_PROVIDER;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_FROM_EMAIL;
    delete process.env.CONTACT_TO_EMAIL;
    delete process.env.CONTACT_REPLY_EMAIL;
  });

  it("uses stable, distinct idempotency keys for notification and acknowledgement", async () => {
    await deliverContactMessage(input);
    expect(mocks.resend).toHaveBeenCalledTimes(2);
    const digest = contactDeliveryDigest(input);
    expect(mocks.resend.mock.calls[0]?.[1]).toEqual({ idempotencyKey: `contact-internal-${digest}` });
    expect(mocks.resend.mock.calls[1]?.[1]).toEqual({ idempotencyKey: `contact-ack-${digest}` });
  });

  it("fails before sending when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(deliverContactMessage(input)).rejects.toBeInstanceOf(ContactProviderError);
    expect(mocks.resend).not.toHaveBeenCalled();
  });

  it("treats the internal notification failure as fatal", async () => {
    mocks.resend.mockResolvedValueOnce({ data: null, error: { name: "validation_error" } });
    await expect(deliverContactMessage(input)).rejects.toMatchObject({ status: 503 });
  });

  it("keeps a successful submission when only the acknowledgement fails", async () => {
    mocks.resend
      .mockResolvedValueOnce({ data: { id: "internal" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: "rate_limit_exceeded" } });
    await expect(deliverContactMessage(input)).resolves.toEqual({ provider: "resend", acknowledgementSent: false });
  });

  it("keeps Harvest as an explicit reversible provider", async () => {
    process.env.CONTACT_EMAIL_PROVIDER = "harvest";
    await expect(deliverContactMessage(input)).resolves.toEqual({ provider: "harvest", acknowledgementSent: false });
    expect(mocks.harvest).toHaveBeenCalledWith(expect.objectContaining({ message: input.harvestMessage }));
    expect(mocks.resend).not.toHaveBeenCalled();
  });
});
