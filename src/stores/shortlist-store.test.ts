import { beforeEach, describe, expect, it } from "vitest";
import { useShortlistStore } from "./shortlist-store";
import type { Track } from "@/types";

const track: Track = {
  id: "track-1",
  title: "Signal",
  duration: 120,
  audioUrl: "/audio/sample-1.mp3",
  albumId: "album-1",
  genres: [],
  moods: [],
  isVocal: false,
  waveform: null,
};

describe("shortlist store", () => {
  beforeEach(() => {
    localStorage.clear();
    useShortlistStore.setState({ items: [], isOpen: false });
  });

  it("déduplique une même piste et ouvre le drawer", () => {
    useShortlistStore.getState().add(track);
    useShortlistStore.getState().add(track);

    expect(useShortlistStore.getState().items).toHaveLength(1);
    expect(useShortlistStore.getState().isOpen).toBe(true);
  });

  it("retire et vide la sélection", () => {
    useShortlistStore.getState().add(track);
    useShortlistStore.getState().remove(track.id);
    expect(useShortlistStore.getState().items).toEqual([]);
  });
});
