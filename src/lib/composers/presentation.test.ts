import { describe, expect, it } from "vitest";
import { composerRoleLabel } from "./presentation";

describe("composer role labels", () => {
  it("uses Compositrice only for Flore in French", () => {
    expect(composerRoleLabel({ slug: "flore", kind: "person" }, "fr")).toBe("Compositrice");
    expect(composerRoleLabel({ slug: "charlotte-savary", kind: "person" }, "fr")).toBe("Compositeur");
  });

  it("uses collective labels for groups and Composer in English", () => {
    expect(composerRoleLabel({ slug: "after-in-paris", kind: "group" }, "fr")).toBe("Collectif");
    expect(composerRoleLabel({ slug: "after-in-paris", kind: "group" }, "en")).toBe("Collective");
    expect(composerRoleLabel({ slug: "flore", kind: "person" }, "en")).toBe("Composer");
  });
});
