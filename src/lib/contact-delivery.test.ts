import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  harvest: vi.fn(),
}));

vi.mock("./harvest/contact", () => ({ sendHarvestContactEmail: mocks.harvest }));

import { deliverContactMessage, type ContactDeliveryInput } from "./contact-delivery";

const input: ContactDeliveryInput = {
  name: "Camille Martin",
  email: "camille@example.com",
  subject: "Demande Parigo Music — Camille Martin",
  harvestMessage: "Entreprise: Studio Exemple\n\nNous cherchons une musique élégante.",
};

describe("contact delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Harvest as the only contact provider", async () => {
    await expect(deliverContactMessage(input)).resolves.toBeUndefined();
    expect(mocks.harvest).toHaveBeenCalledWith(expect.objectContaining({ message: input.harvestMessage }));
  });

  it("propagates a Harvest failure", async () => {
    mocks.harvest.mockRejectedValueOnce(new Error("Harvest failed"));
    await expect(deliverContactMessage(input)).rejects.toThrow("Harvest failed");
  });
});
