import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Track } from "@/types";
import { usePlayerStore } from "@/stores/player-store";
import {
  PlaybackCoordinatorProvider,
  usePlaybackCoordinator,
} from "./PlaybackCoordinatorProvider";

const track: Track = {
  id: "track-1",
  title: "Track 1",
  duration: 90,
  audioUrl: "https://media.invalid.test/track-1.mp3",
  albumId: "album-1",
  genres: [],
  moods: [],
  isVocal: false,
  waveform: null,
};

function CoordinatorProbe({
  pauseClip,
  pauseShowreel,
}: {
  pauseClip: () => void;
  pauseShowreel: () => void;
}) {
  const {
    claim,
    foregroundPlayback,
    isCurrentClaim,
    registerAdapter,
    release,
  } = usePlaybackCoordinator();

  useEffect(() => registerAdapter("clip", { pause: pauseClip }), [pauseClip, registerAdapter]);
  useEffect(() => registerAdapter("showreel", { pause: pauseShowreel }), [pauseShowreel, registerAdapter]);

  return (
    <div>
      <span data-testid="foreground">{foregroundPlayback ?? "none"}</span>
      <button type="button" onClick={() => claim("clip")}>clip</button>
      <button type="button" onClick={() => claim("showreel")}>showreel</button>
      <button
        type="button"
        onClick={() => {
          const claimId = claim("clip");
          claim("showreel");
          document.body.dataset.staleClaim = String(isCurrentClaim("clip", claimId));
        }}
      >
        race
      </button>
      <button type="button" onClick={() => release("clip")}>release clip</button>
    </div>
  );
}

describe("PlaybackCoordinatorProvider", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: track,
      isPlaying: true,
      queue: [track],
      queueIndex: 0,
      progress: 12,
    });
  });

  afterEach(() => {
    cleanup();
    delete document.body.dataset.staleClaim;
    usePlayerStore.getState().clearQueue();
  });

  it("donne la priorité à la dernière source et conserve le contexte track en pause", () => {
    const pauseClip = vi.fn();
    const pauseShowreel = vi.fn();
    render(
      <PlaybackCoordinatorProvider>
        <CoordinatorProbe pauseClip={pauseClip} pauseShowreel={pauseShowreel} />
      </PlaybackCoordinatorProvider>,
    );

    act(() => screen.getByRole("button", { name: "clip" }).click());
    expect(screen.getByTestId("foreground")).toHaveTextContent("clip");
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(track.id);
    expect(usePlayerStore.getState().queue).toHaveLength(1);
    expect(usePlayerStore.getState().progress).toBe(12);
    expect(pauseShowreel).toHaveBeenCalledTimes(1);

    act(() => screen.getByRole("button", { name: "showreel" }).click());
    expect(screen.getByTestId("foreground")).toHaveTextContent("showreel");
    expect(pauseClip).toHaveBeenCalledTimes(1);
  });

  it("invalide un démarrage asynchrone lorsque la priorité change", () => {
    render(
      <PlaybackCoordinatorProvider>
        <CoordinatorProbe pauseClip={vi.fn()} pauseShowreel={vi.fn()} />
      </PlaybackCoordinatorProvider>,
    );

    act(() => screen.getByRole("button", { name: "race" }).click());
    expect(document.body.dataset.staleClaim).toBe("false");
    expect(screen.getByTestId("foreground")).toHaveTextContent("showreel");
  });

  it("ne reprend pas automatiquement une track après libération du clip", () => {
    render(
      <PlaybackCoordinatorProvider>
        <CoordinatorProbe pauseClip={vi.fn()} pauseShowreel={vi.fn()} />
      </PlaybackCoordinatorProvider>,
    );

    act(() => screen.getByRole("button", { name: "clip" }).click());
    act(() => screen.getByRole("button", { name: "release clip" }).click());
    expect(screen.getByTestId("foreground")).toHaveTextContent("none");
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(track.id);
  });
});
