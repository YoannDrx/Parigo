import { beforeEach, describe, expect, it } from "vitest";
import { usePlayerStore } from "./player-store";
import type { Track } from "@/types";

const makeTrack = (id: string): Track => ({
  id,
  title: id,
  duration: 120,
  audioUrl: `https://media.invalid.test/${id}.mp3`,
  albumId: "album-1",
  genres: [],
  moods: [],
  isVocal: false,
  waveform: null,
});

describe("player store", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      queue: [],
      queueIndex: 0,
      progress: 0,
      seekRevision: 0,
      repeatMode: "off",
      shuffleEnabled: false,
    });
  });

  it("enchaîne la queue puis s'arrête en fin de liste", () => {
    const first = makeTrack("first");
    const second = makeTrack("second");
    usePlayerStore.getState().setQueue([first, second]);
    usePlayerStore.getState().play(first);
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().currentTrack?.id).toBe("second");
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentTrack?.id).toBe("second");
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("borne le volume entre zéro et un", () => {
    usePlayerStore.getState().setVolume(2);
    expect(usePlayerStore.getState().volume).toBe(1);
    usePlayerStore.getState().setVolume(-1);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("publie une intention de seek sans changer l’état de lecture", () => {
    const track = makeTrack("seekable");
    usePlayerStore.getState().play(track);
    const revision = usePlayerStore.getState().seekRevision;

    usePlayerStore.getState().seekTo(48);

    expect(usePlayerStore.getState().progress).toBe(48);
    expect(usePlayerStore.getState().seekRevision).toBe(revision + 1);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});
