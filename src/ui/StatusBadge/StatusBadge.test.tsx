import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renderiza label em pt-BR para 'open'", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Aberto")).toBeInTheDocument();
  });

  it("renderiza label para 'in_progress'", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("renderiza label para 'resolved'", () => {
    render(<StatusBadge status="resolved" />);
    expect(screen.getByText("Resolvido")).toBeInTheDocument();
  });

  it("renderiza label para 'closed'", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("Fechado")).toBeInTheDocument();
  });

  it("aplica classe da variante", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Aberto").className).toContain("open");
  });

  it("renderiza fallback para status desconhecido", () => {
    // @ts-expect-error — testando comportamento defensivo
    render(<StatusBadge status="weird" />);
    expect(screen.getByText("weird")).toBeInTheDocument();
  });
});
