import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToastStore } from "@/stores/toast-store";
import { ToastViewport } from "./ToastViewport";

describe("ToastViewport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ items: [] });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("limits the stack to three accessible messages", () => {
    render(<ToastViewport />);
    act(() => {
      toast.info("One");
      toast.success("Two");
      toast.error("Three");
      toast.info("Four");
    });

    expect(screen.queryByText("One")).not.toBeInTheDocument();
    expect(screen.getByText("Two").closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText("Three").closest('[role="alert"]')).toBeInTheDocument();
    expect(screen.getByText("Four")).toBeInTheDocument();
  });

  it("pauses expiration while the message is hovered", () => {
    render(<ToastViewport />);
    act(() => { toast.success("Saved"); });
    const message = screen.getByText("Saved").closest('[role="status"]')!;

    fireEvent.mouseEnter(message);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(screen.getByText("Saved")).toBeInTheDocument();

    fireEvent.mouseLeave(message);
    act(() => { vi.advanceTimersByTime(4_100); });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});
