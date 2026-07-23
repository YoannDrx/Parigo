import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("client session store", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not refetch the session when a new track-level subscriber mounts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          session: {
            user: { id: "member-1", email: "member@parigo.test", name: "Member", image: null, role: "USER", createdAt: "2026-01-01T00:00:00.000Z" },
            session: { expiresAt: "2026-01-02T00:00:00.000Z" },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { useSession } = await import("./auth-client");

    function Probe({ name }: { name: string }) {
      const { data, isPending } = useSession();
      return <span data-testid={name}>{isPending ? "pending" : data?.user.id}</span>;
    }

    const view = render(<><Probe name="page" /><Probe name="first-track" /></>);
    await waitFor(() => expect(screen.getByTestId("page")).toHaveTextContent("member-1"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    view.rerender(<><Probe name="page" /><Probe name="first-track" /><Probe name="second-track" /></>);
    await waitFor(() => expect(screen.getByTestId("second-track")).toHaveTextContent("member-1"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
