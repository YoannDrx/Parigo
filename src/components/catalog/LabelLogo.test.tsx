import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LabelLogo, labelMonogram } from "./LabelLogo";

describe("LabelLogo", () => {
  afterEach(cleanup);

  it("construit un monogramme depuis les mots significatifs du label", () => {
    expect(labelMonogram("The Music Factory")).toBe("MF");
    expect(labelMonogram("Parigo")).toBe("PA");
    expect(labelMonogram("101 Music Compilations")).toBe("1M");
  });

  it("affiche un fallback nommé sans inventer PM", () => {
    render(<LabelLogo src={null} name="Cosmic Library" />);

    expect(screen.getByRole("img", { name: "Cosmic Library" })).toHaveTextContent("CL");
    expect(screen.queryByText("PM")).not.toBeInTheDocument();
  });

  it("rend le fallback silencieux lorsqu’il accompagne déjà un nom visible", () => {
    render(<LabelLogo src={null} name="Cosmic Library" decorative />);

    const fallback = screen.getByTestId("label-logo-fallback");
    expect(fallback).toHaveAttribute("aria-hidden", "true");
    expect(fallback).not.toHaveAttribute("role");
  });

  it("remplace une image en erreur par le fallback du même label", () => {
    render(<LabelLogo src="/broken-logo.png" name="Cosmic Library" />);
    fireEvent.error(screen.getByRole("img", { name: "Cosmic Library" }));

    expect(screen.getByTestId("label-logo-fallback")).toHaveTextContent("CL");
  });
});
