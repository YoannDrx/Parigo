import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ serviceRequest: vi.fn() }));

vi.mock("./client", () => ({ serviceRequest: mocks.serviceRequest }));

import { createHarvestShortUrl } from "./short-url";

describe("createHarvestShortUrl", () => {
  beforeEach(() => mocks.serviceRequest.mockReset());

  it("respecte le corps XML Harvest et sécurise son URL sans protocole", async () => {
    mocks.serviceRequest.mockResolvedValue({ Url: "hrvst.co/p/qfs9n" });
    const canonical = "https://parigo-ten.vercel.app/albums/album-1?track=track-1";

    await expect(createHarvestShortUrl(canonical)).resolves.toBe("https://hrvst.co/p/qfs9n");

    expect(mocks.serviceRequest).toHaveBeenCalledOnce();
    expect(mocks.serviceRequest.mock.calls[0]?.[1]).toEqual({
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: `<requesturl><url>${canonical}</url></requesturl>`,
    });
  });
});
