import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityChip } from "./PriorityChip";

describe("PriorityChip", () => {
  it("renderiza 'Baixa' para 'low'", () => {
    render(<PriorityChip priority="low" />);
    expect(screen.getByText("Baixa")).toBeInTheDocument();
  });

  it("renderiza 'Média' para 'medium'", () => {
    render(<PriorityChip priority="medium" />);
    expect(screen.getByText("Média")).toBeInTheDocument();
  });

  it("renderiza 'Alta' para 'high'", () => {
    render(<PriorityChip priority="high" />);
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("aplica classe da variante", () => {
    render(<PriorityChip priority="high" />);
    expect(screen.getByText("Alta").className).toContain("high");
  });

  it("renderiza fallback para prioridade desconhecida", () => {
    // @ts-expect-error Testing with invalid priority value
    render(<PriorityChip priority="urgent" />);
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });
});
