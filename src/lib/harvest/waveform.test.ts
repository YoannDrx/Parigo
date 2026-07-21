import { describe, expect, it } from "vitest";
import { normalizeWaveform } from "./waveform";

describe("Harvest waveform normalization", () => {
  it("turns interleaved min/max values into normalized peaks", () => {
    expect(normalizeWaveform({ data: [-128, 64, -32, 16] }, 10)).toEqual([1, 0.25]);
  });

  it("downsamples large waveforms", () => {
    const waveform = normalizeWaveform({ data: Array.from({ length: 400 }, (_, index) => index % 2 ? 64 : -64) }, 20);
    expect(waveform).toHaveLength(20);
    expect(waveform.every((peak) => peak === 0.5)).toBe(true);
  });
});
