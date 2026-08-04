import { describe, expect, it } from "vitest";
import { mapMemberProfile } from "./member";

describe("Harvest member profile mapping", () => {
  it("uses SubscribeNewsletter as the newsletter source of truth", () => {
    const profile = mapMemberProfile({
      ID: "member-1",
      Email: "member@example.invalid",
      Subscribe: false,
      SubscribeNewsletter: true,
    });

    expect(profile.subscribed).toBe(true);
  });

  it("keeps backward compatibility when SubscribeNewsletter is absent", () => {
    const profile = mapMemberProfile({ ID: "member-1", Subscribe: true });
    expect(profile.subscribed).toBe(true);
  });
});
