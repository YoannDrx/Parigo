import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { useTrackShareStore } from "@/stores/track-share-store";
import { TrackShareDialog } from "./TrackShareDialog";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function renderDialog(trackId: string) {
  useTrackShareStore.getState().open({ trackId, title: "Éclat nocturne", albumSlug: "album-parigo" });
  return render(<I18nProvider initialLocale="fr"><TrackShareDialog /></I18nProvider>);
}

describe("TrackShareDialog", () => {
  beforeEach(() => {
    useTrackShareStore.setState({ target: null });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not expose the long URL while the provider resolves the short link", async () => {
    let resolveFetch!: (response: Response) => void;
    vi.mocked(fetch).mockReturnValue(new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    renderDialog("track-loading");

    const input = screen.getByLabelText("Lien public");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("placeholder", "Création du lien court…");
    expect(screen.getByRole("button", { name: "Copier le lien court" })).toBeDisabled();

    await act(async () => resolveFetch(Response.json({ data: { url: "https://hrvst.co/p/short", shortened: true } })));
    await waitFor(() => expect(input).toHaveValue("https://hrvst.co/p/short"));
    expect(screen.getByRole("button", { name: "Copier le lien court" })).toBeEnabled();
  });

  it("labels the canonical fallback explicitly", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ data: { url: "https://parigo.test/albums/album-parigo?track=track-fallback", shortened: false } }));
    renderDialog("track-fallback");

    expect(await screen.findByText(/Lien court indisponible/)).toBeInTheDocument();
    expect(screen.getByLabelText("Lien public")).toHaveValue("https://parigo.test/albums/album-parigo?track=track-fallback");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
