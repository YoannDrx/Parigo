import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("keeps public crawling while refusing the abusive AI crawlers", () => {
    const config = robots();

    expect(config.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ userAgent: "*", allow: "/" }),
      { userAgent: ["ClaudeBot", "meta-externalagent"], disallow: "/" },
    ]));
  });
});
