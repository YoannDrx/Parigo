import { describe, expect, it } from "vitest";
import { buildHarvestContactEmail } from "./contact";

describe("Harvest contact email contract", () => {
  it("uses the exact Public API field names confirmed by Harvest", () => {
    expect(buildHarvestContactEmail({
      name: "Camille Martin",
      email: "camille@example.com",
      subject: "Demande Parigo Music",
      message: "Brief de campagne",
    })).toEqual({
      Name: "Camille Martin",
      Email: "camille@example.com",
      PhoneNumber: "",
      Subject: "Demande Parigo Music",
      Message: "Brief de campagne",
    });
  });
});
