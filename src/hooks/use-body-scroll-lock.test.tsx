import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBodyScrollLock } from "./use-body-scroll-lock";

function Lock({ active }: { active: boolean }) {
  useBodyScrollLock(active);
  return null;
}

describe("useBodyScrollLock", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
    document.body.removeAttribute("style");
    delete document.documentElement.dataset.scrollLocked;
  });

  afterEach(() => cleanup());

  it("keeps the document locked until every nested owner releases its lock", () => {
    const first = render(<Lock active />);
    const second = render(<Lock active />);

    expect(document.body.style.position).toBe("fixed");
    expect(document.documentElement.dataset.scrollLocked).toBe("true");

    first.unmount();
    expect(document.body.style.position).toBe("fixed");

    second.unmount();
    expect(document.body.style.position).toBe("");
    expect(document.documentElement.dataset.scrollLocked).toBeUndefined();
  });

  it("restores pre-existing inline styles", () => {
    document.body.style.overflow = "clip";
    const view = render(<Lock active />);

    view.unmount();
    expect(document.body.style.overflow).toBe("clip");
  });
});
