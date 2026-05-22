import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("deriva até 2 iniciais do nome", () => {
    render(<Avatar name="Lucas Ferreira" />);
    expect(screen.getByText("LF")).toBeInTheDocument();
  });

  it("usa só uma inicial quando o nome tem uma palavra", () => {
    render(<Avatar name="Ana" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("expõe o nome completo como aria-label", () => {
    render(<Avatar name="Marcos Vinicius" />);
    expect(screen.getByLabelText("Marcos Vinicius")).toBeInTheDocument();
  });
});
