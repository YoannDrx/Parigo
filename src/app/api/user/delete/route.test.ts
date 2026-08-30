import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  memberRequest: vi.fn(),
  assertSameOrigin: vi.fn(),
  clearHarvestSession: vi.fn(),
  requireHarvestSession: vi.fn(),
}));

vi.mock("@/lib/harvest/api", () => ({
  requestId: () => "delete-request-1",
  apiError: (error: unknown) => Response.json({ error: String(error) }, { status: 400 }),
}));
vi.mock("@/lib/harvest/client", () => ({ memberRequest: mocks.memberRequest }));
vi.mock("@/lib/harvest/session", () => ({
  assertSameOrigin: mocks.assertSameOrigin,
  clearHarvestSession: mocks.clearHarvestSession,
  requireHarvestSession: mocks.requireHarvestSession,
}));

import { DELETE } from "./route";

function request(body: unknown) {
  return new Request("https://parigo.invalid/api/user/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("DELETE /api/user/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireHarvestSession.mockResolvedValue({ memberToken: "member-token" });
    mocks.memberRequest.mockResolvedValue({});
  });

  it("always closes the account through Harvest soft deletion", async () => {
    const response = await DELETE(request({ password: "secret" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual({ closed: true });
    const pathBuilder = mocks.memberRequest.mock.calls[0]?.[1] as (token: string) => string;
    expect(pathBuilder("redacted-token")).toBe("/removememberverifypassword/redacted-token");
    expect(JSON.parse(String(mocks.memberRequest.mock.calls[0]?.[2]?.body))).toEqual({
      Password: "secret",
      ArchiveOnly: true,
    });
    expect(mocks.clearHarvestSession).toHaveBeenCalledOnce();
  });

  it("rejects attempts to override the archival policy", async () => {
    const response = await DELETE(request({ password: "secret", archiveOnly: false }));
    expect(response.status).toBe(400);
    expect(mocks.memberRequest).not.toHaveBeenCalled();
  });
});
