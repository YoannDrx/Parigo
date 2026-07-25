import { describe, expect, it } from "vitest";
import { classifyVideoTitle } from "./video-classification";

describe("classifyVideoTitle", () => {
  it.each([
    ["Dark Ambient Vol. 2 — Making Of", "making-of"],
    ["Acid Body Music — teaser", "teaser"],
    ["Mark Awards 2021 nominee", "award"],
    ["Bonne année 2023", "announcement"],
    ["Myles Sanko live session", "live"],
    ["DMC World Championship", "performance"],
    ["Lofi Hip Hop — official video", "official-video"],
    ["Vegomatic archive", "archive"],
    ["Un contenu sans marqueur", "other"],
  ] as const)("classe %s comme %s", (title, expected) => {
    expect(classifyVideoTitle(title)).toBe(expected);
  });
});
